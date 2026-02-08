# @nyoworks/feature-storage

S3/R2 compatible file storage for NYOWORKS projects.

## Features

- Presigned URL uploads (direct to S3/R2)
- Upload progress tracking
- File management (list, delete)
- Public and private files
- Queue-based batch uploads
- Cloudflare R2 compatible

## Installation

This feature is automatically included when you select "Storage" during project setup.

## Environment Variables

### AWS S3

```env
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET=my-bucket
S3_PUBLIC_URL=https://cdn.example.com
```

### Cloudflare R2

```env
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET=my-bucket
S3_PUBLIC_URL=https://pub-xxx.r2.dev
```

### Alternative AWS Variable Names

The module also supports standard AWS environment variables:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

## Usage

### Schema

Import and add to your database schema:

```typescript
import { files } from "@nyoworks/feature-storage/schema"

export const schema = {
  ...otherTables,
  files,
}
```

### Router

Add to your tRPC router:

```typescript
import { storageRouter } from "@nyoworks/feature-storage/router"

export const appRouter = router({
  storage: storageRouter,
})
```

### Hooks

Use in React components:

```tsx
import { useUpload, useFiles, usePresignedUrl } from "@nyoworks/feature-storage"

function FileUploader() {
  const { upload, isUploading, progress, error } = useUpload()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const result = await upload({
      file,
      folder: "documents",
      isPublic: false,
      onProgress: (p) => console.log(`Upload progress: ${p}%`),
    })

    if (result) {
      console.log("Uploaded:", result.url)
    }
  }

  return (
    <div>
      <input type="file" onChange={handleFileSelect} disabled={isUploading} />
      {isUploading && <progress value={progress} max={100} />}
      {error && <p>Error: {error.message}</p>}
    </div>
  )
}
```

### Batch Uploads

```tsx
import { useFileUploadQueue } from "@nyoworks/feature-storage"

function BatchUploader() {
  const { queue, isProcessing, addToQueue, processQueue, clearCompleted } = useFileUploadQueue()

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    addToQueue(files)
  }

  return (
    <div>
      <input type="file" multiple onChange={handleFilesSelect} />
      <button onClick={() => processQueue({ folder: "uploads" })} disabled={isProcessing}>
        Upload All
      </button>
      <button onClick={clearCompleted}>Clear Completed</button>

      {queue.map((item) => (
        <div key={item.id}>
          {item.file.name} - {item.status} ({item.progress}%)
        </div>
      ))}
    </div>
  )
}
```

### File Listing

```tsx
import { useFiles } from "@nyoworks/feature-storage"

function FileList() {
  const { files, isLoading, fetchFiles, deleteFile, hasMore } = useFiles()

  useEffect(() => {
    fetchFiles({ folder: "documents", limit: 20 })
  }, [])

  return (
    <div>
      {files.map((file) => (
        <div key={file.id}>
          <a href={file.url}>{file.filename}</a>
          <span>{file.size} bytes</span>
          <button onClick={() => deleteFile(file.id)}>Delete</button>
        </div>
      ))}
      {hasMore && <button onClick={() => fetchFiles({ offset: files.length })}>Load More</button>}
    </div>
  )
}
```

## API Routes

Set up the following API routes in your application:

- `POST /api/storage/request-upload` - Request presigned upload URL
- `POST /api/storage/confirm-upload` - Confirm file upload
- `GET /api/storage/files` - List files
- `GET /api/storage/files/:id/url` - Get presigned download URL
- `DELETE /api/storage/files/:id` - Delete file

## CORS Configuration

For direct browser uploads to S3/R2, configure CORS:

### S3 CORS

```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://your-domain.com"],
      "AllowedMethods": ["PUT", "GET"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }
  ]
}
```

### R2 CORS

Configure in Cloudflare dashboard under R2 bucket settings.
