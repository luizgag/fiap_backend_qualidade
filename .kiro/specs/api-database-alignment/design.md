# Design Document

## Overview

This design addresses the systematic alignment of API models with database table structures in the application. The current implementation has several misalignments that cause inconsistencies, require manual field mapping, and create potential runtime errors. The solution will standardize field names, add missing properties, and ensure type safety across the data layer.

## Architecture

The alignment will follow a layered approach:

1. **Database Layer**: Maintain existing database schema (no changes to table structure)
2. **Model Layer**: Update TypeScript interfaces to match database columns exactly
3. **Data Access Layer**: Modify DB class methods to return data matching the updated models
4. **Controller Layer**: Remove manual field mapping and rely on aligned models

## Components and Interfaces

### 1. Updated API Models

#### Post Model
```typescript
export interface Post {
    id?: number;           // Add missing id field
    title: string;
    content: string;
    author_id: number;     // Change from 'author' to match DB column
}
```

#### Comment Model
```typescript
export interface Comment {
    id?: number;
    post_id: number;
    user_id: number;       // Change from 'author_id' to match DB column
    comentario: string;    // Change from 'content' to match DB column
    resposta_id?: number;  // Add missing field from DB
    created_at?: string;
}
```

#### Like Model (Already aligned)
```typescript
export interface Like {
    id?: number;
    post_id: number;
    user_id: number;
    created_at?: string;
}
```

#### User Model (Already aligned)
```typescript
export type User = {
    id: number;
    nome: string;
    email: string;
    senha: string;
    tipo_usuario: 'aluno' | 'professor';
}
```

### 2. Database Query Alignment

#### Post Queries
- Remove field aliasing in SELECT statements
- Return `author_id` instead of mapping to different field names
- Add `id` field to create operations return type

#### Comment Queries
- Use `user_id` consistently instead of `author_id`
- Use `comentario` field instead of `content`
- Include `resposta_id` field in query results
- Remove field aliasing that creates mismatches

### 3. Controller Updates

#### PostController
- Update method signatures to use aligned Post model
- Remove manual field mapping in create/update operations
- Handle `author_id` instead of `author` in request processing

#### CommentController
- Update to use `user_id` and `comentario` fields
- Remove field mapping between API and database layer
- Ensure consistent field names throughout the flow

## Data Models

### Database Schema (No Changes)
```sql
-- Posts table
CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id INTEGER NOT NULL,
    FOREIGN KEY (author_id) REFERENCES usuarios(id)
);

-- Comments table  
CREATE TABLE comentarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    comentario TEXT NOT NULL,
    resposta_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ...
);
```

### Aligned API Models
The API models will directly reflect the database column names and include all available fields, eliminating the need for field mapping.

## Error Handling

### Type Safety Improvements
- TypeScript will catch field name mismatches at compile time
- Partial updates will enforce correct property names
- Database method signatures will match API model types

### Runtime Error Prevention
- Eliminate field mapping errors in database operations
- Prevent undefined property access due to name mismatches
- Ensure consistent data structure throughout the application

### Migration Strategy
- Update models first to establish new contracts
- Update database methods to return aligned data
- Update controllers to use new field names
- Update tests to reflect new model structure

## Testing Strategy

### Unit Tests
- Update existing controller tests to use aligned models
- Test database methods return correctly structured data
- Verify type safety with TypeScript compilation
- Test partial updates with new field names

### Integration Tests
- Verify end-to-end data flow with aligned models
- Test API endpoints return correctly structured responses
- Validate database operations work with new field names

### Regression Testing
- Ensure existing functionality remains intact
- Verify no data loss during model alignment
- Test backward compatibility where needed

### Test Data Updates
- Update test fixtures to use aligned field names
- Modify mock data to reflect new model structure
- Update assertion expectations in existing tests

## Implementation Considerations

### Breaking Changes
- API responses will have different field names (e.g., `author_id` instead of `author`)
- Client applications may need updates to handle new field names
- Existing API contracts will change

### Backward Compatibility
- Consider adding field aliases during transition period if needed
- Document breaking changes for API consumers
- Provide migration guide for client applications

### Performance Impact
- Removing field mapping will improve query performance
- Simplified data flow reduces processing overhead
- Type safety improvements aid development efficiency