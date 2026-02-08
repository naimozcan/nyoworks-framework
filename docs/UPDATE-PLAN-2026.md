# NYOWORKS Framework v2.6.1 → v2.7.0 Update Plan

> Tarih: 2026-02-08
> Hedef: Tüm bağımlılıkları 2026 best practices'e uygun güncellemek

---

## ÖZET

| Faz | Paketler | Risk | Süre |
|-----|----------|------|------|
| 1 | Minor Updates (hono, lucide, @types) | Düşük | 30 dk |
| 2 | Expo SDK 54 → 55 | Orta | 2 saat |
| 3 | drizzle-orm 0.38 → 0.45 | Orta | 1 saat |
| 4 | tailwind-merge 2 → 3 | Düşük | 30 dk |
| 5 | Zustand 4 → 5 | Orta | 1 saat |
| 6 | Stripe 19 → 20, Resend 4 → 6 | Orta | 1 saat |
| 7 | Zod 3 → 4 | Yüksek | 4-6 saat |
| 8 | jsPDF 2 → 4 | Düşük | 30 dk |
| **TOPLAM** | | | **10-12 saat** |

---

## FAZ 1: Minor Updates (Düşük Risk)

### Güncellenecek Paketler

```bash
# Root
pnpm add -D -w @types/node@^22.15.0

# packages/api
pnpm --filter @nyoworks/api add hono@^4.8.0

# packages/ui
pnpm --filter @nyoworks/ui add lucide-react@^0.475.0
```

### Breaking Changes: YOK

Bu güncellemeler backward compatible. Direkt güncellenebilir.

---

## FAZ 2: Expo SDK 55 (Orta Risk)

### Güncellenecek Paketler

```bash
cd apps/mobile

# Core SDK
npx expo install expo@~55.0.0
npx expo install expo-router@~5.0.0
npx expo install expo-status-bar@~2.2.0
npx expo install expo-splash-screen@~0.30.0
npx expo install expo-secure-store@~14.1.0
npx expo install expo-notifications@~0.30.0

# React Native
npx expo install react-native@0.82.x
npx expo install react-native-gesture-handler@~2.25.0
npx expo install react-native-reanimated@~3.18.0
npx expo install react-native-safe-area-context@5.3.0
npx expo install react-native-screens@~4.10.0
npx expo install react-native-svg@15.11.1

# NativeWind
pnpm add nativewind@^4.2.0
```

### Breaking Changes

1. **Expo Router v5**: File-based routing değişiklikleri
   - `useLocalSearchParams` → `useGlobalSearchParams` bazı durumlarda
   - Typed routes API değişikliği

2. **React Native 0.82**: New Architecture varsayılan
   - `app.json`'da `newArchEnabled: true` eklenmeli

### Kod Değişiklikleri

**apps/mobile/app.config.ts:**
```typescript
// Eklenecek
newArchEnabled: true,
```

### Verification

```bash
cd apps/mobile
npx expo doctor
pnpm build
```

---

## FAZ 3: Drizzle ORM 0.45 (Orta Risk)

### Güncellenecek Paketler

```bash
pnpm --filter @nyoworks/database add drizzle-orm@^0.45.1
pnpm --filter @nyoworks/database add -D drizzle-kit@^0.31.0
```

### Breaking Changes

1. **Query API değişikliği**: `db.query` artık deprecated
   - Select builder kullanılmalı

2. **Type inference**: `$inferSelect` ve `$inferInsert` değişikliği yok

3. **Prepared statements**: API aynı

### Kod Değişiklikleri

Mevcut kodumuz zaten `db.select().from()` pattern kullanıyor. Değişiklik gerekmez.

### Verification

```bash
pnpm --filter @nyoworks/database build
pnpm --filter "@nyoworks/feature-*" build
```

---

## FAZ 4: tailwind-merge v3 (Düşük Risk)

### Güncellenecek Paketler

```bash
pnpm --filter @nyoworks/ui add tailwind-merge@^3.4.0
```

### Breaking Changes

1. **Tailwind v4 required**: Zaten v4 kullanıyoruz ✓
2. **extendTailwindMerge API**: Değişiklik yok
3. **ES2020 target**: Zaten ES2022 kullanıyoruz ✓

### Kod Değişiklikleri

YOK - Mevcut `cn()` utility'si çalışmaya devam edecek.

### Verification

```bash
pnpm --filter @nyoworks/ui build
pnpm --filter @nyoworks/web build
```

---

## FAZ 5: Zustand v5 (Orta Risk)

### Güncellenecek Paketler

```bash
pnpm --filter @nyoworks/shared add zustand@^5.0.11
```

### Breaking Changes

1. **`create` API değişikliği**:
   ```typescript
   // v4 (eski)
   import create from "zustand"
   const useStore = create((set) => ({ ... }))

   // v5 (yeni)
   import { create } from "zustand"
   const useStore = create<State>()((set) => ({ ... }))
   ```

2. **TypeScript generics**: Artık curried function

3. **Middleware API**: `devtools`, `persist` aynı

### Kod Değişiklikleri

**packages/shared/src/stores/*.ts:**
```typescript
// Her store dosyasında:

// ESKİ
import create from "zustand"
export const useAuthStore = create<AuthState>((set) => ({
  // ...
}))

// YENİ
import { create } from "zustand"
export const useAuthStore = create<AuthState>()((set) => ({
  // ...
}))
```

### Etkilenen Dosyalar

1. `packages/shared/src/stores/auth.ts`
2. `packages/shared/src/stores/ui.ts`
3. `packages/shared/src/stores/tenant.ts`

### Verification

```bash
pnpm --filter @nyoworks/shared build
pnpm --filter @nyoworks/web build
```

---

## FAZ 6: Stripe v20 + Resend v6 (Orta Risk)

### Stripe v20

```bash
pnpm --filter @nyoworks/feature-payments add stripe@^20.3.1
pnpm --filter @nyoworks/feature-subscriptions add stripe@^20.3.1
```

#### Breaking Changes

1. **Node.js 18+ required**: Zaten 22 kullanıyoruz ✓
2. **API version**: `2025-01-27.acacia` yeni default
3. **Subscription types**: `current_period_start/end` artık kesin var

#### Kod Değişiklikleri

**packages/features/payments/src/services/payments.service.ts:**
```typescript
// Type assertion'ları kaldır
const periodStart = subscription.current_period_start
const periodEnd = subscription.current_period_end
```

### Resend v6

```bash
pnpm --filter @nyoworks/feature-notifications add resend@^6.9.1
```

#### Breaking Changes

1. **`send()` response**: `id` yerine `data.id`
   ```typescript
   // v4
   const { id } = await resend.emails.send({ ... })

   // v6
   const { data } = await resend.emails.send({ ... })
   const id = data?.id
   ```

2. **Error handling**: `error` property eklendi

#### Kod Değişiklikleri

**packages/features/notifications/src/providers.ts:**
```typescript
// ESKİ
const { id } = await this.resend.emails.send({
  from: this.fromEmail,
  to: notification.recipient,
  subject: notification.title,
  html: notification.body,
})

// YENİ
const { data, error } = await this.resend.emails.send({
  from: this.fromEmail,
  to: notification.recipient,
  subject: notification.title,
  html: notification.body,
})

if (error) {
  throw new Error(`Resend error: ${error.message}`)
}

const id = data?.id
```

### Verification

```bash
pnpm --filter @nyoworks/feature-payments build
pnpm --filter @nyoworks/feature-subscriptions build
pnpm --filter @nyoworks/feature-notifications build
```

---

## FAZ 7: Zod v4 (Yüksek Risk - En Kapsamlı)

### Güncellenecek Paketler

```bash
# Tüm workspace'de
pnpm add -w zod@^4.3.6

# Her feature module
pnpm --filter "@nyoworks/feature-*" add zod@^4.3.6
pnpm --filter @nyoworks/validators add zod@^4.3.6
pnpm --filter @nyoworks/api add zod@^4.3.6
```

### Breaking Changes

1. **Error handling**:
   ```typescript
   // v3
   const result = schema.safeParse(data)
   if (!result.success) {
     console.log(result.error.errors)
   }

   // v4
   const result = schema.safeParse(data)
   if (!result.success) {
     console.log(result.error.issues)  // errors → issues
   }
   ```

2. **`z.string().email()` stricter**: RFC 5322 compliant

3. **`z.coerce` API**:
   ```typescript
   // v3
   z.coerce.number()

   // v4 - aynı, ama stricter validation
   z.coerce.number()
   ```

4. **`z.enum` from array**:
   ```typescript
   // v3
   z.enum(["a", "b", "c"])

   // v4 - aynı syntax, ama type inference değişti
   z.enum(["a", "b", "c"])
   ```

5. **Custom error messages**:
   ```typescript
   // v3
   z.string().min(1, "Required")

   // v4 - aynı syntax
   z.string().min(1, "Required")
   ```

6. **`z.ZodError` → `z.core.ZodError`**: Import değişikliği

### Kod Değişiklikleri

#### 1. Error Handling (tüm dosyalarda)

```typescript
// Her yerde .errors → .issues
catch (error) {
  if (error instanceof z.ZodError) {
    // ESKİ: error.errors
    // YENİ: error.issues
    return error.issues.map(issue => issue.message)
  }
}
```

#### 2. API Error Formatter

**packages/api/src/trpc.ts:**
```typescript
// ESKİ
errorFormatter({ shape, error }) {
  return {
    ...shape,
    data: {
      ...shape.data,
      zodError: error.cause instanceof Error ? error.cause.message : null,
    },
  }
}

// YENİ - zod v4 uyumlu
errorFormatter({ shape, error }) {
  return {
    ...shape,
    data: {
      ...shape.data,
      zodError: error.cause instanceof z.ZodError
        ? error.cause.issues
        : null,
    },
  }
}
```

### Etkilenen Dosyalar (Tam Liste)

```
packages/validators/src/*.ts (tüm dosyalar)
packages/features/*/src/validators.ts (14 dosya)
packages/api/src/trpc.ts
packages/api/src/routers/*.ts
apps/web/src/lib/validators.ts
apps/mobile/src/lib/validators.ts
```

### Migration Script

```bash
# Tüm dosyalarda .errors → .issues değiştir
find packages apps -name "*.ts" -exec sed -i '' 's/\.errors/\.issues/g' {} \;

# Manuel kontrol gerekli - false positive olabilir
```

### Verification

```bash
pnpm build
pnpm typecheck
pnpm test
```

---

## FAZ 8: jsPDF v4 (Düşük Risk)

### Güncellenecek Paketler

```bash
pnpm --filter @nyoworks/feature-export add jspdf@^4.1.0
```

### Breaking Changes

1. **Constructor API**:
   ```typescript
   // v2
   const doc = new jsPDF("p", "mm", "a4")

   // v4
   const doc = new jsPDF({
     orientation: "portrait",
     unit: "mm",
     format: "a4"
   })
   ```

2. **Font handling**: `addFont()` API değişti

3. **Image handling**: `addImage()` async oldu

### Kod Değişiklikleri

**packages/features/export/src/services/export.service.ts:**
```typescript
// ESKİ
const doc = new jsPDF("p", "mm", "a4")

// YENİ
const doc = new jsPDF({
  orientation: "portrait",
  unit: "mm",
  format: "a4"
})
```

### Verification

```bash
pnpm --filter @nyoworks/feature-export build
```

---

## UYGULAMA SIRASI

### Adım 1: Backup
```bash
git checkout -b feature/v2.7.0-updates
git push -u origin feature/v2.7.0-updates
```

### Adım 2: Faz 1 (Minor)
```bash
pnpm add -D -w @types/node@^22.15.0
pnpm --filter @nyoworks/api add hono@^4.8.0
pnpm --filter @nyoworks/ui add lucide-react@^0.475.0
pnpm build && pnpm typecheck
git add . && git commit -m "chore: update minor dependencies"
```

### Adım 3: Faz 3 (Drizzle)
```bash
pnpm --filter @nyoworks/database add drizzle-orm@^0.45.1 drizzle-kit@^0.31.0
pnpm build && pnpm typecheck
git add . && git commit -m "chore: update drizzle-orm to 0.45"
```

### Adım 4: Faz 4 (tailwind-merge)
```bash
pnpm --filter @nyoworks/ui add tailwind-merge@^3.4.0
pnpm build && pnpm typecheck
git add . && git commit -m "chore: update tailwind-merge to v3"
```

### Adım 5: Faz 5 (Zustand)
```bash
pnpm --filter @nyoworks/shared add zustand@^5.0.11
# Kod değişikliklerini yap
pnpm build && pnpm typecheck
git add . && git commit -m "feat: migrate zustand to v5"
```

### Adım 6: Faz 6 (Stripe + Resend)
```bash
pnpm --filter @nyoworks/feature-payments add stripe@^20.3.1
pnpm --filter @nyoworks/feature-subscriptions add stripe@^20.3.1
pnpm --filter @nyoworks/feature-notifications add resend@^6.9.1
# Kod değişikliklerini yap
pnpm build && pnpm typecheck
git add . && git commit -m "feat: update stripe v20, resend v6"
```

### Adım 7: Faz 7 (Zod - EN ÖNEMLİ)
```bash
pnpm add -w zod@^4.3.6
pnpm --filter "@nyoworks/*" add zod@^4.3.6
# TÜM kod değişikliklerini yap
pnpm build && pnpm typecheck
git add . && git commit -m "feat: migrate zod to v4"
```

### Adım 8: Faz 8 (jsPDF)
```bash
pnpm --filter @nyoworks/feature-export add jspdf@^4.1.0
# Kod değişikliklerini yap
pnpm build && pnpm typecheck
git add . && git commit -m "chore: update jspdf to v4"
```

### Adım 9: Faz 2 (Expo - AYRI BRANCH)
```bash
git checkout -b feature/expo-55-upgrade
cd apps/mobile
npx expo install expo@~55.0.0 --fix
# Tüm Expo paketlerini güncelle
pnpm build
git add . && git commit -m "feat: upgrade to expo sdk 55"
```

### Adım 10: Final Merge
```bash
git checkout main
git merge feature/v2.7.0-updates
git merge feature/expo-55-upgrade
git tag v2.7.0
git push origin main --tags
```

---

## ROLLBACK PLANI

Her faz için ayrı commit olduğundan, sorun çıkarsa:

```bash
# Son başarılı commit'e dön
git revert HEAD

# Veya belirli faza dön
git log --oneline
git checkout <commit-hash>
```

---

## POST-UPDATE CHECKLIST

- [ ] `pnpm build` - 25/25 paket başarılı
- [ ] `pnpm typecheck` - 30/30 paket başarılı
- [ ] `pnpm test` - Tüm testler geçiyor
- [ ] E2E test: `npx create-nyoworks@latest test-v270`
- [ ] Mobile: Expo Go'da test
- [ ] Web: localhost:3000 test
- [ ] API: localhost:3001/trpc health check

---

## SONUÇ

Bu plan uygulandığında:

1. **Tüm paketler 2026 güncel sürümlerine** çıkmış olacak
2. **Type safety artacak** (Zod v4 stricter)
3. **Performans iyileşecek** (Zustand v5, Drizzle 0.45)
4. **Güvenlik güncellemeleri** uygulanmış olacak
5. **Mobile platform** en son SDK'ya geçmiş olacak

Framework versiyonu: **v2.6.1 → v2.7.0**
