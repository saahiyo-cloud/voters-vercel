# Electoral Search Portal (Vercel Deployable)

A modern, responsive, and secure single-page web application to query and verify Indian voter card details by EPIC (Voter ID) number.

This project wraps the Election Commission of India (ECI) gateway endpoints using a FastAPI backend and presents details in a compact, print-ready, premium layout.

## 🚀 Features

- **FastAPI Serverless Backend**: Serves as a secure proxy to fetch CAPTCHA images, encrypt payloads, and query ECI servers.
- **EPIC State Auto-Fill**: Parses prefix codes on key input (e.g. `ZNO...` immediately populates `Gujarat`) to reduce form-filling friction.
- **Searchable State Select**: Integrated datalist search fields to query and filter states cleanly.
- **Premium Compact UI**: Clean cards showing personal details, regional name translations, serial positions, and room locations.
- **GPS Map Locator**: Automatically checks for geolocation coordinates and links polling booths directly to Google Maps.
- **Circular Refresh CAPTCHA & Loaders**: Circular refresh button with hover states and active spinner states in the search button.
- **Printable Slip**: Includes media print styles that exclude headers and styling wrappers to print out clean voter verification slips.

## 📁 Project Structure

```text
voters-vercel/
├── api/
│   └── index.py            # Serverless FastAPI app (encryption, decryption, proxies)
├── index.html              # Search Portal markup (Remix Icons, searchable selectors)
├── style.css               # Compact responsive styling & animations
├── app.js                  # Asynchronous form submission & geolocation parsers
├── requirements.txt        # Python package dependencies
├── vercel.json             # Vercel Serverless routing rewrites
└── README.md               # Application Documentation
```

## 💻 Local Development

1. **Install Python Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
   *Note: Requires `pycryptodome` for the cryptographic handshake with ECI servers.*

2. **Run Dev Server**:
   ```bash
   python -m uvicorn api.index:app --reload
   ```

3. **Open Browser**:
   Navigate to [http://127.0.0.1:8000](http://127.0.0.1:8000). The FastAPI app automatically serves the frontend assets when running locally.

## ☁️ Vercel Deployment

Deploy this folder directly to Vercel:
```bash
vercel deploy
```
Vercel automatically detects the `api/index.py` serverless functions and routes static assets using `vercel.json` config.
