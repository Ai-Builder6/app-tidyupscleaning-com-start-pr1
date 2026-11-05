---
name: gmp-common-api-keys
description: Manage Google Maps Platform API keys, including generation, security, and required authentication mechanisms.
license: Apache-2.0
metadata:
  version: 1.0.54
---

> [!IMPORTANT] **Core Dependency:** This skill requires active context from
> [google-maps-platform/SKILL.md](https://www.gstatic.com/googlemapsplatform-agent-skills/google-maps-platform/SKILL.md).

### Production API Key Generation

*   **Source:** A production API Key is obtained from the Google Cloud Console.
*   **Action:** Direct the user to the
    [Google Cloud Console Credentials page](https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentskills_v1)
    to generate a key and enable the required APIs.
*   **Storage:** Keys **MUST** be stored securely in environment variables
    (e.g., in a `.env` file or secret manager) and **NEVER** hardcoded into
    source files.

### Maps Demo Key (Prototyping)

The Maps Demo Key offers a fast, zero-cost path for initial prototyping before a
full Google Cloud Project setup.

*   **Use Case:** Recommended for low-volume development, testing, and
    proof-of-concept work.
*   **Access:** The user must complete a short console flow at the
    [Maps Demo Key page](https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentskills_v1)
    to mint the key.
*   **Constraint:** The Maps Demo Key is **NOT** for production usage and has an
    inherent daily limit.
*   **Supported APIs (Example):** Maps JavaScript API, Places API, Routes API,
    Geocoding API, Weather API, Maps Grounding Lite, Places UI Kit. (See
    official documentation for the latest list of supported APIs.)
*   **Reference:** For more details, refer to the Maps Demo Key documentation
    [here](https://developers.google.com/maps/documentation/javascript/demo-key?utm_campaign=gmp_git_agentskills_v1).

### API Key Security and Restriction

All API keys, especially those intended for production, **MUST** be restricted
to prevent unauthorized use, quota theft, and potential billing spikes.

*   **General Principle:** The key should only be usable by the platform and
    APIs for which it was created.
*   **Restriction Types:**
    *   **Web Applications:** Restrict by **HTTP Referrer** (e.g.,
        `*.yourdomain.com/*`).
    *   **Android Applications:** Restrict by **Package Name** and **SHA-1
        Certificate Fingerprint**.
    *   **iOS Applications:** Restrict by **Bundle ID**.
    *   **Server-side Applications:** Restrict by server **IP Address**.
    *   **API Restriction:** Limit the key to only the specific Google Maps
        Platform APIs (e.g., Maps JavaScript API, Geocoding API) actively used
        in the application.
*   **Guide:** Detailed steps for adding restrictions are available at
    [Restricting an API Key](https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentskills_v1).

### Authentication Mechanisms

Different Google Maps Platform services require different authentication
methods.

*   **API Key (Standard):** Used for most client-side SDKs and REST APIs,
    including Maps JS, Places, Geocoding, Address Validation, Time Zone,
    Elevation, Roads, Static Maps, and Street View Static.
*   **OAuth / Application Default Credentials (ADC):** Required for highly
    sensitive or server-intensive APIs. Using an API Key for these endpoints
    will result in a `401 Unauthorized` error. This includes:
    *   Route Optimization API.
    *   Map Tiles session tokens.
    *   Places Aggregate API.
    *   Mobility/Fleet Engine services.

********************************************************************************

### References

*   https://console.cloud.google.com/google/maps-apis/credentials?utm_campaign=gmp_git_agentskills_v1
*   https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentskills_v1
*   https://developers.google.com/maps/documentation/javascript/demo-key?utm_campaign=gmp_git_agentskills_v1
*   https://docs.cloud.google.com/api-keys/docs/add-restrictions-api-keys?utm_campaign=gmp_git_agentskills_v1
