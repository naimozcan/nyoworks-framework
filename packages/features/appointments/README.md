# @nyoworks/feature-appointments

NYOWORKS Appointments Feature - Scheduling and booking management for multi-tenant applications.

## Installation

```bash
pnpm add @nyoworks/feature-appointments
```

## Features

- **Appointments**: Create, update, cancel, confirm, and complete appointments
- **Services**: Manage bookable services with duration and pricing
- **Providers**: Manage service providers with their profiles
- **Availability**: Set and manage provider availability schedules
- **Booking**: Check available time slots and book appointments

## Usage

### Database Schema

```typescript
import { appointments, services, providers, availability } from "@nyoworks/feature-appointments/schema"
```

### tRPC Router

```typescript
import { appointmentsRouter } from "@nyoworks/feature-appointments/router"

const appRouter = t.router({
  appointments: appointmentsRouter,
})
```

### React Hooks

```typescript
import {
  useAppointments,
  useServices,
  useProviders,
  useAvailability,
  useBooking,
} from "@nyoworks/feature-appointments"
```

## API Reference

### Appointments

- `appointments.create` - Create a new appointment
- `appointments.update` - Update an existing appointment
- `appointments.get` - Get appointment details
- `appointments.list` - List appointments with filters
- `appointments.delete` - Delete an appointment
- `appointments.cancel` - Cancel an appointment
- `appointments.confirm` - Confirm an appointment
- `appointments.complete` - Mark appointment as completed
- `appointments.myAppointments` - List current user's appointments

### Services

- `services.create` - Create a new service
- `services.update` - Update a service
- `services.get` - Get service details
- `services.list` - List all services
- `services.delete` - Delete a service

### Providers

- `providers.create` - Create a new provider
- `providers.update` - Update a provider
- `providers.get` - Get provider details
- `providers.list` - List all providers
- `providers.delete` - Delete a provider
- `providers.addService` - Add a service to a provider
- `providers.removeService` - Remove a service from a provider
- `providers.getServices` - Get services offered by a provider

### Availability

- `availability.set` - Set availability for a day
- `availability.update` - Update availability
- `availability.delete` - Delete availability slot
- `availability.getForProvider` - Get provider's weekly availability
- `availability.checkSlots` - Check available slots for a date
- `availability.getSlots` - Get available slots for a date range

## Database Tables

- `appointment_services` - Bookable services
- `appointment_providers` - Service providers
- `appointment_provider_services` - Provider-service junction
- `appointment_availability` - Provider availability schedule
- `appointments` - Booked appointments

## License

MIT
