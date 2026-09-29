-- ==========================================================
-- TalentHub / Forcecraver Recruiter Portal Database Schema
-- Database: PostgreSQL 14+
-- ==========================================================

-- Enable UUID extension if not present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Users / Recruiters Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    first_name VARCHAR(150),
    last_name VARCHAR(150),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'RECRUITER', -- 'ADMIN', 'DEVELOPER', 'RECRUITER'
    designation VARCHAR(150) DEFAULT 'HR Recruiter',
    is_active BOOLEAN DEFAULT TRUE,
    can_post_jd BOOLEAN DEFAULT FALSE,
    can_screen_candidates BOOLEAN DEFAULT TRUE,
    can_access_candidates BOOLEAN DEFAULT TRUE,
    can_schedule_interviews BOOLEAN DEFAULT TRUE,
    is_developer BOOLEAN DEFAULT FALSE,
    otp_code VARCHAR(10),
    otp_expires_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 2. Open Job Descriptions (Jobs) Table
CREATE TABLE IF NOT EXISTS jobs (
    id VARCHAR(100) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    company_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    skills TEXT,
    experience VARCHAR(100),
    location VARCHAR(255),
    salary_budget VARCHAR(100),
    job_description TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- 'ACTIVE' (Open) or 'CLOSED'
    shift_timing VARCHAR(100) DEFAULT 'Engineering',
    notes TEXT,
    created_by VARCHAR(255),
    creator_id VARCHAR(100),
    creator_email VARCHAR(255),
    posted_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_name);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_date ON jobs(posted_date DESC);

-- 3. Candidates Table
CREATE TABLE IF NOT EXISTS candidates (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    first_name VARCHAR(150),
    last_name VARCHAR(150),
    email VARCHAR(255),
    phone VARCHAR(50),
    experience VARCHAR(50),
    location VARCHAR(255),
    current_role VARCHAR(255),
    current_company VARCHAR(255),
    current_ctc VARCHAR(100),
    expected_ctc VARCHAR(100),
    notice_period VARCHAR(100),
    resume_url TEXT,
    resume_file_name VARCHAR(255),
    skills TEXT,
    notes TEXT,
    screening_notes TEXT,
    screening_status VARCHAR(100) DEFAULT 'Submitted',
    interview_status VARCHAR(100) DEFAULT 'Submitted',
    interview_date DATE,
    interview_time VARCHAR(50),
    interview_link TEXT,
    interviewer_name VARCHAR(255),
    interview_round VARCHAR(100),
    rating INTEGER DEFAULT 0, -- 1 to 5
    job_id VARCHAR(100) REFERENCES jobs(id) ON DELETE SET NULL,
    company_name VARCHAR(255),
    job_title VARCHAR(255),
    recruiter_id VARCHAR(100),
    recruiter_email VARCHAR(255),
    sourced_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_candidates_job_id ON candidates(job_id);
CREATE INDEX IF NOT EXISTS idx_candidates_recruiter_id ON candidates(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(screening_status);
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON candidates(created_at DESC);
