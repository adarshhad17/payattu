# Payyatu — Money Management App

## Overview

A money management app to track money exchanged between people.

---

## Core Concept

For each person, track:

| Field           | Description                          |
|-----------------|--------------------------------------|
| Name            | Person's name                        |
| I Give          | amount I gave to them          |
| They Give       |  amount they gave to me         |
| Kodukkanullath  | Net balance = I Give − They Give     |
| Koduthath       | newly i give       |

### Balance Logic

| Condition             | Meaning                        |
|-----------------------|--------------------------------|
| Kodukkanullath = 0    | Kodukanilla — nothing owed     |
| Kodukkanullath > 0    | see the amount       |
| Kodukkanullath < 0    | Kittanullath      |

---

## Roles

| Role   | Permissions                                      |
|--------|--------------------------------------------------|
| Admin  | Full access — add, edit, manage all records      |
| Parent | Can only add entries in newly i give      |

---

## Tech Stack

- **Frontend:** React, Redux, Tailwind CSS
- **Backend:** Node.js, Express
- **Database:** MongoDB
