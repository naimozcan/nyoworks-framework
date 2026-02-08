# @nyoworks/feature-export

Export feature for NYOWORKS projects - PDF and CSV export capabilities.

## Features

- Export jobs with status tracking
- PDF export with jsPDF
- CSV export with Papa Parse
- React hooks with polling support
- Multi-tenant support

## Installation

This feature is automatically included when you select "Export" during project setup.

## Dependencies

- jspdf: PDF generation
- papaparse: CSV parsing and generation

## Usage

### Schema

Import and add to your database schema:

```typescript
import { exportJobs } from "@nyoworks/feature-export/schema"

export const schema = {
  ...otherTables,
  exportJobs,
}
```

### Router

Add to your tRPC router:

```typescript
import { exportRouter } from "@nyoworks/feature-export/router"

export const appRouter = router({
  export: exportRouter,
})
```

### Hooks

Use in React components:

```tsx
import { useExport, useExportJob, useExportDownload } from "@nyoworks/feature-export"

function ExportButton() {
  const { startExport, isLoading } = useExport()
  const [jobId, setJobId] = useState<string | null>(null)
  const { job, startPolling } = useExportJob(jobId)
  const { download } = useExportDownload()

  const handleExport = async () => {
    const id = await startExport({
      type: "contacts",
      format: "csv",
      filters: { status: "active" },
    })
    if (id) {
      setJobId(id)
      startPolling()
    }
  }

  useEffect(() => {
    if (job?.status === "completed" && job.fileUrl) {
      download(job.id)
    }
  }, [job])

  return (
    <button onClick={handleExport} disabled={isLoading}>
      {isLoading ? "Starting..." : "Export to CSV"}
    </button>
  )
}
```

### Exporters

Use exporters directly for custom export logic:

```typescript
import { exportToPdf, exportToCsv, generateFilename } from "@nyoworks/feature-export"

const pdfData = exportToPdf({
  title: "Contacts Export",
  columns: ["name", "email", "phone"],
  data: contacts,
  orientation: "landscape",
})

const csvData = exportToCsv({
  columns: ["name", "email", "phone"],
  data: contacts,
})

const filename = generateFilename("contacts", "pdf")
```

## API Endpoints

### Export Jobs
- `POST /api/export` - Create export job
- `GET /api/export/:id` - Get export job status
- `GET /api/export` - List export jobs
- `GET /api/export/:id/download` - Download completed export
- `DELETE /api/export/:id` - Cancel export job

## Export Formats

### PDF Options
- `title`: Document title
- `columns`: Column headers
- `data`: Array of row objects
- `orientation`: "portrait" or "landscape"
- `fontSize`: Font size (default: 10)
- `headerColor`: RGB array for header background

### CSV Options
- `columns`: Column headers
- `data`: Array of row objects
- `delimiter`: Field delimiter (default: ",")
- `header`: Include header row (default: true)

## Environment Variables

No additional environment variables required for basic export functionality.

For cloud storage integration (optional):
- `EXPORT_STORAGE_BUCKET` - Cloud storage bucket name
- `EXPORT_STORAGE_REGION` - Cloud storage region
