# RentShield

RentShield helps students avoid rental scams using a transparent, rule-based risk scoring system. It does not use AI, machine learning, a backend, or a database.

## Problem Statement

Students are frequent targets for rental scams because they often need housing quickly, may be searching from another city or country, and do not always know what warning signs to check before sending money or documents.

## Solution Overview

RentShield gives students a simple web app to:

- analyze a rental listing with clear risk rules
- detect scam red flags
- receive safety recommendations
- estimate affordability with a student budget calculator
- save and compare listings locally in the browser
- generate a copyable safety report for sharing or review

## Core Features

- Home page with the problem and solution overview
- Rental risk checker form
- Rule-based scam risk score from 0 to 100
- Risk level badges: Low, Medium, High
- Red flags section
- Safety recommendations section
- Student budget calculator
- Listing comparison dashboard
- localStorage persistence for saved listings
- Copyable text safety report
- Sample listing loader for quick onboarding and testing

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- localStorage for persistence

## How The Scoring Works

The risk score is fully rule-based and capped at 100:

- Payment requested before visit: `+30`
- No visit possible: `+25`
- Landlord not verified: `+20`
- Sensitive documents requested early: `+20`
- No signed lease: `+20`
- Deposit higher than two months of rent: `+15`
- Very low rent compared to typical student rent: `+15`
- Missing important listing description: `+10`

Risk levels:

- `0-30`: Low risk
- `31-60`: Medium risk
- `61-100`: High risk

## How To Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open `http://localhost:3000`

## Devpost Positioning

RentShield aligns well with:

- Cybersecurity and Privacy
- Financial Technology
- Web and Mobile Development
- Data Science and Analytics
- Product Management and Strategy

## Future Improvements

- Add country-specific rental law checks
- Add export to PDF
- Add roommate split budgeting
- Add browser-side listing screenshot attachments
- Add more city rent benchmarks
- Add multilingual support for international students
