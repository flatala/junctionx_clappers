# import whisper
# from fastapi import UploadFile
# import tempfile
#
# # Load model once on startup
# whisper_model = whisper.load_model("small")
#
#
# async def process_audio_file(file: UploadFile):
#     with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
#         tmp.write(await file.read())
#         tmp_path = tmp.name
#
#     result = whisper_model.transcribe(tmp_path)
#
#     return result
