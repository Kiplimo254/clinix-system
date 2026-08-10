# clinix-system

A comprehensive, multi-tenant Clinic Management System built with Django and React (Vite). 

## Features
- **Multi-Tenant Architecture**: Shared database with data isolation by clinic.
- **Authentication & Roles**: Secure JWT authentication with Role-Based Access Control (Admin, Doctor, Nurse, Receptionist).
- **Patient Management**: Complete patient records and visit histories.
- **Appointments & Calendar**: 30-minute booking slots, check-ins, and doctor schedule views.
- **Clinical Records**: Vitals, triage, diagnoses, and prescriptions.
- **Privacy Controls**: Strict access gating requiring doctor approval (PIN/Password) to view sensitive diagnosis and prescription notes.

## Tech Stack
- **Backend**: Django, Django REST Framework, SQLite (Development) / PostgreSQL (Production), Celery, Redis.
- **Frontend**: React, Vite, React Router, TanStack Query, Axios, standard CSS modules with modern UI.
