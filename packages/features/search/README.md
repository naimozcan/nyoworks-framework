# @nyoworks/feature-search

Full-text search feature for NYOWORKS projects using PostgreSQL tsvector.

## Features

- PostgreSQL full-text search with ranking
- Debounced search input
- Highlighted search results
- Multi-entity type filtering
- Bulk indexing support
- Autocomplete suggestions
- Pagination with infinite scroll

## Installation

This feature is automatically included when you select "Search" during project setup.

## Environment Variables

No additional environment variables required. Uses existing PostgreSQL connection.

## Database Setup

Run the migration to create the search index table:

```sql
CREATE TABLE search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX search_index_tenant_idx ON search_index(tenant_id);
CREATE INDEX search_index_entity_type_idx ON search_index(entity_type);
CREATE INDEX search_index_entity_idx ON search_index(entity_type, entity_id);
CREATE INDEX search_index_vector_idx ON search_index USING GIN(search_vector);
```

## Usage

### Schema

Import and add to your database schema:

```typescript
import { searchIndex } from "@nyoworks/feature-search/schema"

export const schema = {
  ...otherTables,
  searchIndex,
}
```

### Router

Add to your tRPC router:

```typescript
import { searchRouter } from "@nyoworks/feature-search/router"

export const appRouter = router({
  search: searchRouter,
})
```

### Hooks

Use in React components:

```tsx
import { useSearch, useSearchResults, useIndexDocument } from "@nyoworks/feature-search"

function SearchPage() {
  const {
    query,
    setQuery,
    results,
    isLoading,
    hasMore,
    loadMore,
    clear,
  } = useSearch({
    entityTypes: ["product", "article"],
    debounceMs: 300,
    highlight: true,
  })

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
      />

      {isLoading && <div>Loading...</div>}

      {results.map(result => (
        <div key={result.id}>
          <span>{result.entityType}</span>
          <div dangerouslySetInnerHTML={{ __html: result.headline || result.content }} />
        </div>
      ))}

      {hasMore && (
        <button onClick={loadMore}>Load More</button>
      )}
    </div>
  )
}
```

### Indexing Documents

```tsx
import { useIndexDocument } from "@nyoworks/feature-search"

function ProductForm() {
  const { index, remove, isLoading } = useIndexDocument()

  const handleSave = async (product: Product) => {
    await saveProduct(product)

    await index({
      entityType: "product",
      entityId: product.id,
      content: `${product.name} ${product.description}`,
      metadata: { category: product.category },
    })
  }

  const handleDelete = async (productId: string) => {
    await deleteProduct(productId)
    await remove("product", productId)
  }
}
```

## API Endpoints

### Search
- `GET /api/search` - Full-text search with ranking
  - Query params: `query`, `entityTypes[]`, `limit`, `offset`, `highlight`, `highlightTag`

### Index Management
- `POST /api/search/index` - Index or update a document
- `POST /api/search/remove` - Remove document from index
- `POST /api/search/bulk` - Bulk index documents
- `POST /api/search/reindex` - Reindex all documents

### Suggestions
- `GET /api/search/suggest` - Get autocomplete suggestions
  - Query params: `query`, `entityTypes[]`, `limit`

### Stats
- `GET /api/search/stats` - Get index statistics by entity type
