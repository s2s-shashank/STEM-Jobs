# New Jersey STEM Job Data Sources & API Access Guide

This document outlines official sources for scraping or pulling structured STEM job data in New Jersey via REST APIs, direct downloads, and HTML scraping.

---

## 1. USAJOBS Search API (Federal Government STEM Roles in NJ)

The USAJOBS API provides official access to federal STEM postings in New Jersey (e.g., Department of Defense at Picatinny Arsenal, FAA Technical Center, EPA Region 2).

* **Access Type:** REST API (JSON)
* **API Documentation:** [https://developer.usajobs.gov/api-reference](https://developer.usajobs.gov/api-reference)
* **Key Required Headers:**
  * `Authorization-Key`: Your unique API key from USAJOBS Developer Portal.
  * `User-Agent`: Your email address.
  * `Host`: `data.usajobs.gov`

### Target STEM Category Codes (Job Series)
* `2210` - Information Technology Management
* `0801` - General Engineering
* `1550` - Computer Science
* `1301` - General Physical Science

### Example Python Extraction Script
```python
import requests
import json

url = "https://data.usajobs.gov/api/search"
headers = {
    "User-Agent": "your_email@example.com",
    "Authorization-Key": "YOUR_USAJOBS_API_KEY",
    "Host": "data.usajobs.gov"
}

params = {
    "LocationName": "New Jersey",
    "JobCategoryCode": ["2210", "0801", "1550"], # IT, Engineering, CS
    "ResultsPerPage": 100
}

response = requests.get(url, headers=headers, params=params)
data = response.json()

# Process jobs
jobs = []
for item in data['SearchResult']['SearchResultItems']:
    matched_object = item['MatchedObjectDescriptor']
    jobs.append({
        'title': matched_object['PositionTitle'],
        'organization': matched_object['OrganizationName'],
        'location': matched_object['PositionLocation'][0]['LocationName'],
        'url': matched_object['PositionURI'],
        'min_salary': matched_object['PositionRemuneration'][0]['MinimumRange'],
        'max_salary': matched_object['PositionRemuneration'][0]['MaximumRange']
    })

print(f"Retrieved {len(jobs)} jobs in NJ.")
```

---

## 2. CareerOneStop API (U.S. Department of Labor Aggregator)

CareerOneStop provides comprehensive live job board coverage across public and private sectors in New Jersey.

* **Access Type:** REST API (JSON)
* **Registration:** Free API Key at [https://api.careeronestop.org/](https://api.careeronestop.org/)
* **Endpoint Pattern:**
  `https://api.careeronestop.org/v2/jobsearch/{userId}/{keyword}/{location}/{radius}/{sortColumns}/{sortOrder}/{startRecord}/{pageSize}/{days}`

### Key Target Parameters for NJ STEM
* **Location:** `NJ`
* **Common STEM Keywords / SOC Codes:**
  * `15-1252.00` (Software Developers)
  * `17-2051.00` (Civil Engineers)
  * `15-1211.00` (Computer Systems Analysts)

### Example Python API Call
```python
import requests

USER_ID = "YOUR_USER_ID"
API_KEY = "YOUR_BEARER_TOKEN"
KEYWORD = "Software Engineer"
LOCATION = "NJ"

url = f"https://api.careeronestop.org/v2/jobsearch/{USER_ID}/{KEYWORD}/{LOCATION}/25/0/DESC/1/100/30"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()

if "Jobs" in data:
    for job in data["Jobs"]:
        print(f"Title: {job.get('JobTitle')} | Company: {job.get('Company')} | Location: {job.get('Location')}")
```

---

## 3. NJ Civil Service Commission (State Government Web Scrape)

For state and local municipal government openings in New Jersey, the Civil Service Commission (CSC) publishes standard web pages that can be parsed directly using `pandas` or `BeautifulSoup`.

* **Access Type:** Web Scraping (HTML)
* **Base Portal:** [https://info.csc.state.nj.us/JobAnnouncements/](https://info.csc.state.nj.us/JobAnnouncements/)
* **Scraping Target:** Open-to-Public Job Announcements

### Example Scraper using Pandas
```python
import pandas as pd

# Target open announcements list
url = "https://info.csc.state.nj.us/JobAnnouncements/Default.aspx"

# Read HTML tables directly from page
try:
    tables = pd.read_html(url)
    job_table = tables[0] # Main table
    print("Found job table:")
    print(job_table.head())
    
    # Save directly to CSV
    job_table.to_csv("nj_civil_service_jobs.csv", index=False)
except Exception as e:
    print("Error parsing HTML tables:", e)
```

---

## 4. NJ Department of Environmental Protection (NJDEP Jobs)

The NJDEP maintains state environmental engineering, GIS, water management, and research technician postings on a clean, single-page site.

* **Access Type:** Web Scraping (HTML)
* **Target URL:** [https://dep.nj.gov/jobs/](https://dep.nj.gov/jobs/)

### Example Scraper using BeautifulSoup
```python
import requests
from bs4 import BeautifulSoup

url = "https://dep.nj.gov/jobs/"
response = requests.get(url)
soup = BeautifulSoup(response.content, 'html.parser')

# Parsing job listings from structured tags
job_links = soup.find_all('a', href=True)
stem_jobs = []

for link in job_links:
    title = link.text.strip()
    href = link['href']
    # Filter by common STEM terms in DEP postings
    if any(term in title.lower() for term in ['engineer', 'gis', 'data', 'environmental', 'scientist', 'trainee']):
        stem_jobs.append({'title': title, 'url': href})

print(f"Found {len(stem_jobs)} NJDEP STEM listings.")
```

---

## Summary of Extraction Methods

| Source | Access Type | Output Format | Recommended Tool |
| :--- | :--- | :--- | :--- |
| **USAJOBS API** | REST API (Key Required) | JSON | Python `requests` |
| **CareerOneStop** | REST API (Key Required) | JSON | Python `requests` |
| **NJ CSC** | Web Scraping | HTML Tables | Python `pandas.read_html()` |
| **NJDEP** | Web Scraping | HTML Links/Text | Python `BeautifulSoup` |