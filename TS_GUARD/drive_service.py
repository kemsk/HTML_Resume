import io, os, json
from googleapiclient.errors import HttpError
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
from TS.models import *
from dotenv import load_dotenv
from django.core.cache import cache
from django.http import HttpResponse
from googleapiclient.http import MediaIoBaseDownload

load_dotenv(".env")

SCOPES = ['https://www.googleapis.com/auth/drive.file']
SERVICE_ACCOUNT_FILE = os.environ.get("GOOGLE_SERVICE_ACCOUNT")
FOLDER_ID = os.environ.get("GOOGLE_DRIVE_FOLDER_ID")

if not FOLDER_ID:
    raise Exception("GOOGLE_DRIVE_FOLDER_ID is not set or loaded from .env!")

info = json.loads(SERVICE_ACCOUNT_FILE)
credentials = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
drive_service = build('drive', 'v3', credentials=credentials)

def upload_file_to_drive(file, filename):
    print("Uploading to Google Drive folder:", FOLDER_ID)

    file_metadata = {
        'name': filename,
        'parents': [FOLDER_ID]
    }

    media = MediaIoBaseUpload(file, mimetype=file.content_type, resumable=True)

    try:
        uploaded_file = drive_service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id'
        ).execute()

        file_id = uploaded_file.get('id')
        print("Upload successful. File ID:", file_id)

        try:
            drive_service.permissions().create(
                fileId=file_id,
                body={'type': 'anyone', 'role': 'reader'},
                fields='id',
            ).execute()
            print(f"File {file_id} made public.")
        except Exception as perm_err:
            print(f"Failed to set public permission for file {file_id}: {perm_err}")


        return file_id

    except Exception as e:
        print("Upload failed:", str(e))
        raise


def serve_drive_image(request, ticket_id):
    try:
        cache_key = f"ticket_image_{ticket_id}"
        cached_image = cache.get(cache_key)
        if cached_image:
            return HttpResponse(cached_image['data'], content_type=cached_image['mime_type'])

        file_id = Ticket.objects.get(ticket_id=ticket_id).photo_path
        if not file_id:
            return HttpResponse("Image not Found", status=404)

        metadata = drive_service.files().get(fileId=file_id, fields="mimeType, name, parents").execute()
        mime_type = metadata.get("mimeType")

        if not mime_type or not mime_type.startswith("image/"):
            return HttpResponse("File is not an image", status=400)

        allowed_folder = os.environ.get("AUTHORIZED_FOLDER_ID")
        parents = metadata.get("parents", [])
        if allowed_folder and allowed_folder not in parents:
            return HttpResponse("Unauthorized access to file", status=403)


        request_media = drive_service.files().get_media(fileId=file_id)
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request_media)
        done = False
        while not done:
            _, done = downloader.next_chunk()
        fh.seek(0)
        image_data = fh.read()

    
        cache.set(cache_key, {'data': image_data, 'mime_type': mime_type}, timeout=300)

        return HttpResponse(image_data, content_type=mime_type)

    except Ticket.DoesNotExist:
        return HttpResponse("Ticket not found", status=404)
    except HttpError as e:
        return HttpResponse(f"Drive access error: {e}", status=403)
    except Exception as e:
        return HttpResponse(f"Unexpected error: {str(e)}", status=500)