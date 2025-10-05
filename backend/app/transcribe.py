from pathlib import Path
import ffmpeg
import soundfile as sf
import librosa


def convert_video_to_audio(video_path: str, output_audio_path: str) -> str:
    video_path = Path(video_path)
    audio_path = Path(output_audio_path)
    audio_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        print(f"[INFO] Extracting audio from video: {video_path}")
        stream = ffmpeg.input(str(video_path))
        stream = ffmpeg.output(stream, str(output_audio_path), acodec='pcm_s16le', ac=1, ar='16k')
        ffmpeg.run(stream, overwrite_output=True, capture_stdout=True, capture_stderr=True)
        print(f"[INFO] Converted video to audio: {output_audio_path}")
        return str(output_audio_path)
    except Exception as e:
        print(f"[ERROR] Error converting video: {e}")
        raise


def split_audio_to_patches(audio_path: str, patch_duration_sec: int = 120, overlap_sec: int = 10):
    print(f"[INFO] Loading audio for patching: {audio_path}")
    y, sr = librosa.load(audio_path, sr=None)
    total_duration = librosa.get_duration(y=y, sr=sr)
    print(f"[INFO] Audio duration: {total_duration:.2f} seconds")
    patch_samples = int(patch_duration_sec * sr)
    overlap_samples = int(overlap_sec * sr)
    step = patch_samples - overlap_samples
    patches = []
    for start in range(0, len(y), step):
        end = min(start + patch_samples, len(y))
        patch_y = y[start:end]
        patch_idx = len(patches)
        patch_path = Path(audio_path).parent / f"patch_{patch_idx:03d}.wav"
        sf.write(str(patch_path), patch_y, sr)
        print(f"[INFO] Saved patch {patch_idx}: {patch_path} ({(end-start)/sr:.2f}s)")
        patches.append(str(patch_path))
        if end == len(y):
            break
    return patches


def transcribe_patches(patches, model):
    all_results = []
    for i, patch_path in enumerate(patches):
        print(f"[INFO] Transcribing patch {i}: {patch_path}")
        
        # faster-whisper returns (segments_generator, info)
        segments, info = model.transcribe(
            patch_path,
            word_timestamps=True,
            vad_filter=True,
            beam_size=1
        )
        
        # Convert generator to list to allow iteration
        segments = list(segments)
        
        result = {
            "text": "",
            "segments": [],
            "words": []
        }
        
        word_id = 0
        for segment in segments:
            result["text"] += segment.text
            result["segments"].append({
                "start": segment.start,
                "end": segment.end,
                "text": segment.text
            })
            
            # In faster-whisper, words are accessed directly as segment.words
            if hasattr(segment, 'words') and segment.words:
                for word in segment.words:
                    result["words"].append({
                        'id': word_id,
                        'word': word.word.strip(),
                        'start': word.start,
                        'end': word.end,
                        'probability': word.probability,
                        'phrase_text': segment.text,
                        'phrase_start': segment.start,
                        'phrase_end': segment.end
                    })
                    word_id += 1
        
        patch_result = {
            'language': info.language if hasattr(info, 'language') else 'unknown',
            'words': result["words"],
            'patch_index': i,
            'patch_text': result["text"]
        }
        
        print(f"[INFO] Patch {i} language: {patch_result['language']}, words: {len(result['words'])}")
        
        # Add safety check
        if not result["words"]:
            print(f"[WARNING] No words detected in patch {i}. Text: '{result['text'][:100]}'")
        
        all_results.append(patch_result)
    
    return all_results