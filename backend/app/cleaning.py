from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Job
from pathlib import Path
from typing import List, Optional
import json
from moviepy import VideoFileClip, AudioFileClip, ColorClip
from moviepy.video.compositing.CompositeVideoClip import concatenate_videoclips
from pydub import AudioSegment
import zipfile
from pydub.generators import Sine
from fastapi.responses import FileResponse
import tempfile
import os

router = APIRouter()


def _normalize_and_validate_spans(spans: List[dict], total_ms: Optional[int] = None) -> List[dict]:
    """Return cleaned, sorted, non-overlapping spans in milliseconds.

    Each span is a dict with numerical `start` and `end` in seconds.
    This clamps spans to [0, total_ms] if total_ms is provided and merges overlaps.
    """
    cleaned = []
    for s in spans:
        if not isinstance(s, dict) or 'start' not in s or 'end' not in s:
            raise ValueError(f"Invalid span format: {s}")
        start_ms = int(round(float(s['start']) * 1000))
        end_ms = int(round(float(s['end']) * 1000))
        if end_ms <= start_ms:
            continue
        cleaned.append((max(0, start_ms), end_ms))

    if not cleaned:
        return []

    cleaned.sort(key=lambda x: x[0])

    # Merge overlapping/adjacent
    merged = [list(cleaned[0])]
    for a, b in cleaned[1:]:
        if a <= merged[-1][1]:  # overlap or contiguous
            merged[-1][1] = max(merged[-1][1], b)
        else:
            merged.append([a, b])

    if total_ms is not None:
        for i in range(len(merged)):
            merged[i][0] = max(0, merged[i][0])
            merged[i][1] = min(total_ms, merged[i][1])
        # remove empty after clamp
        merged = [m for m in merged if m[1] > m[0]]

    return [{'start_ms': m[0], 'end_ms': m[1]} for m in merged]


def _is_video(path: Path) -> bool:
    return path.suffix.lower() in {'.mp4', '.mov', '.mkv', '.avi', '.webm'}


def process_remove(file_path: Path, spans: List[dict]) -> Path:
    """Remove intervals described in `spans` completely from the input.

    If input is a video (mp4 etc.) the output will be an mp4 with removed sections both
    in video and audio. If input is an audio file the returned file will be the same audio
    format with the segments removed.
    """
    if _is_video(file_path):
        clip = VideoFileClip(str(file_path))
        total_ms = int(clip.duration * 1000)
        cleaned_spans = _normalize_and_validate_spans(spans, total_ms=total_ms)

        kept_clips = []
        last_end = 0
        for s in cleaned_spans:
            start = s['start_ms'] / 1000.0
            end = s['end_ms'] / 1000.0
            if start > last_end:
                kept_clips.append(clip.subclip(last_end, start))
            last_end = end

        # tail
        if last_end < clip.duration:
            kept_clips.append(clip.subclip(last_end, clip.duration))

        # If nothing left, create a 500ms black clip with silent audio to avoid errors
        if not kept_clips:
            black:ColorClip = ColorClip(size=(clip.w, clip.h), color=(0, 0, 0), duration=0.5)
            silent_audio = AudioSegment.silent(duration=500)
            tmp_audio = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
            silent_audio.export(tmp_audio.name, format="mp3")
            tmp_audio.close()
            black = black.with_audio(AudioFileClip(tmp_audio.name))
            output_path = file_path.parent / f"removed_{file_path.name}"
            black.write_videofile(str(output_path), codec="libx264", audio_codec="aac")
            black.close()
            clip.close()
            os.unlink(tmp_audio.name)
            return output_path

        final_clip = (
            kept_clips[0]
            if len(kept_clips) == 1
            else concatenate_videoclips(kept_clips, method="compose")
        )

        output_path = file_path.parent / f"removed_{file_path.name}"
        final_clip.write_videofile(str(output_path), codec="libx264", audio_codec="aac")

        # cleanup
        final_clip.close()
        clip.close()
        for c in kept_clips:
            try:
                c.close()
            except Exception:
                pass
        return output_path

    else:
        # Audio-only file: cut the spans out using pydub
        audio = AudioSegment.from_file(str(file_path))
        total_ms = len(audio)
        cleaned_spans = _normalize_and_validate_spans(spans, total_ms=total_ms)

        pieces = []
        last = 0
        for s in cleaned_spans:
            start = s['start_ms']
            end = s['end_ms']
            if start > last:
                pieces.append(audio[last:start])
            last = end
        if last < total_ms:
            pieces.append(audio[last:total_ms])

        if pieces:
            new_audio = sum(pieces)
        else:
            new_audio = AudioSegment.silent(duration=500)

        output_path = file_path.parent / f"removed_{file_path.name}"
        new_audio.export(str(output_path), format=file_path.suffix.replace('.', ''))
        return output_path


def process_silence(file_path: Path, spans: List[dict]) -> Path:
    """Replace flagged intervals with silence.

    For videos: audio is modified and re-attached (output is mp4). For audio files: a new
    audio file in the same format is written.
    """
    if _is_video(file_path):
        video = VideoFileClip(str(file_path))
        audio = AudioSegment.from_file(str(file_path))
        total_ms = int(video.duration * 1000)
        cleaned_spans = _normalize_and_validate_spans(spans, total_ms=total_ms)

        for s in cleaned_spans:
            start = s['start_ms']
            end = s['end_ms']
            audio = audio[:start] + AudioSegment.silent(duration=(end - start)) + audio[end:]

        # export temp audio and attach back
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        tmp.close()
        audio.export(tmp.name, format="mp3")

        modified_audio = AudioFileClip(tmp.name)
        video = video.with_audio(modified_audio)

        output_path = file_path.parent / f"silenced_{file_path.name}"
        video.write_videofile(str(output_path), codec="libx264", audio_codec="aac")

        # cleanup
        video.close()
        modified_audio.close()
        os.unlink(tmp.name)
        return output_path

    else:
        audio = AudioSegment.from_file(str(file_path))
        total_ms = len(audio)
        cleaned_spans = _normalize_and_validate_spans(spans, total_ms=total_ms)

        for s in cleaned_spans:
            start = s['start_ms']
            end = s['end_ms']
            audio = audio[:start] + AudioSegment.silent(duration=(end - start)) + audio[end:]

        output_path = file_path.parent / f"silenced_{file_path.name}"
        audio.export(str(output_path), format=file_path.suffix.replace('.', ''))
        return output_path
    

def process_beep(file_path: Path, spans: List[dict], beep_freq: int = 1000, beep_gain_db: int = 0) -> Path:
    """Replace flagged spans with a repeated beep sound.

    beep_freq: frequency of the sine wave in Hz
    beep_gain_db: gain to apply to the beep (dB)
    """
    # Create a short beep prototype (in ms)
    proto_ms = 200
    proto_beep = Sine(beep_freq).to_audio_segment(duration=proto_ms).apply_gain(beep_gain_db)

    if _is_video(file_path):
        video = VideoFileClip(str(file_path))
        audio = AudioSegment.from_file(str(file_path))
        total_ms = int(video.duration * 1000)
        print(f"[DEBUG] total_ms: {total_ms}")
        cleaned_spans = _normalize_and_validate_spans(spans, total_ms=total_ms)

        for s in cleaned_spans:
            start = s['start_ms']
            end = s['end_ms']
            duration = end - start
            repeat_count = duration // proto_ms
            remainder = duration % proto_ms
            beep_segment = proto_beep * repeat_count
            if remainder > 0:
                beep_segment += proto_beep[:remainder]
            audio = audio[:start] + beep_segment + audio[end:]

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        tmp.close()
        audio.export(tmp.name, format="mp3")

        modified_audio = AudioFileClip(tmp.name)
        final_video = video.with_audio(modified_audio)

        output_path = file_path.parent / f"beeped_{file_path.name}"
        final_video.write_videofile(str(output_path), codec="libx264", audio_codec="aac")

        # cleanup
        final_video.close()
        modified_audio.close()
        os.unlink(tmp.name)
        return output_path
    else:
        audio = AudioSegment.from_file(str(file_path))
        total_ms = len(audio)
        print(f"[DEBUG] total_ms: {total_ms}")
        cleaned_spans = _normalize_and_validate_spans(spans, total_ms=total_ms)

        for s in cleaned_spans:
            start = s['start_ms']
            end = s['end_ms']
            duration = end - start
            repeat_count = duration // proto_ms
            remainder = duration % proto_ms
            beep_segment = proto_beep * repeat_count
            if remainder > 0:
                beep_segment += proto_beep[:remainder]
            audio = audio[:start] + beep_segment + audio[end:]

        output_path = file_path.parent / f"beeped_{file_path.name}"
        audio.export(str(output_path), format=file_path.suffix.replace('.', ''))
        print(f"[DEBUG] Exporting beeped audio to {output_path}")
        return output_path



@router.post("")
def clean(
    batch_id: Optional[str] = Query(None),
    job_ids: Optional[List[str]] = Query(None),
    processing_method: str = Query("remove", regex="^(remove|silence|beep)$"),
    db: Session = Depends(get_db)
):
    if not batch_id and not job_ids:
        jobs = db.query(Job).all()
    elif batch_id and not job_ids:
        jobs = db.query(Job).filter(Job.batch_id == batch_id).all()
    elif job_ids:
        jobs = db.query(Job).filter(Job.id.in_(job_ids)).all()
    else:
        raise HTTPException(status_code=400, detail="Invalid parameters. Provide either batch_id or job_ids.")

    if not jobs:
        raise HTTPException(status_code=404, detail="No jobs found for the given parameters.")

    processed_files = []
    for job in jobs:
        file_path = Path(job.original_file_path)
        if file_path.suffix in ['.mp4']:
            file_path = Path(job.original_file_path.replace('.mp4', '.mp3'))

        print(f"[INFO] Processing job {job.id} with method '{processing_method}' on file {file_path}")
        if not file_path.exists():
            print(f"[WARNING] File not found: {file_path}")
            continue
        
        processed_dir = Path("uploads")
        zip_extract_dir = file_path.parent
        if zip_extract_dir.name.startswith(f"batch_{job.batch_id}_zip_"):
            processed_dir = processed_dir / zip_extract_dir.name

        spans_path = processed_dir / (file_path.stem + ".json")
        if not spans_path.exists():
            print(f"[WARNING] Processed spans file not found: {spans_path}")
            continue

        with open(spans_path, "r") as f:
            spans = json.load(f)
            if isinstance(spans, dict) and "spans" in spans:
                spans = spans["spans"]

        print(f"[INFO] Loaded {len(spans)} spans for job {job.id}")

        try:
            if processing_method == "remove":
                output_path = process_remove(file_path, spans)
            elif processing_method == "silence":
                output_path = process_silence(file_path, spans)
            elif processing_method == "beep":
                output_path = process_beep(file_path, spans)
            else:
                raise HTTPException(status_code=400, detail="Unknown processing method")
        except Exception as e:
            print(f"[ERROR] Failed processing job {job.id}: {e}")
            continue

        processed_files.append(output_path)

        job.status = "cleaned"
        job.cleaned_file_path = str(output_path)
        db.commit()

    if not processed_files:
        raise HTTPException(status_code=404, detail="No files processed")

    zip_path = Path("uploads/cleaned_data.zip")
    zip_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "w") as zipf:
        for file in processed_files:
            zipf.write(file, arcname=file.name)

    return FileResponse(zip_path, media_type="application/zip", filename="cleaned_data.zip")