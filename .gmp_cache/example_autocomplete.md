This document details the recommended modern approach for implementing Place
Autocomplete functionality within React applications using the
`@vis.gl/react-google-maps` framework. It focuses exclusively on the
promise-based `AutocompleteSuggestion` API, adheres to session token best
practices, and demonstrates three distinct implementation styles.

--------------------------------------------------------------------------------

## 1. Core Architecture and Initialization

All Google Maps Platform interactions must be encapsulated within the
`APIProvider`. The example demonstrates connecting a Map instance with a dynamic
component control panel.

### 1.1 Root Component Structure (`app.tsx`)

```tsx
import React, {useState} from 'react';
import {APIProvider, ControlPosition, Map} from '@vis.gl/react-google-maps';

const API_KEY: string = 'YOUR_API_KEY'; // Replace with actual key

const App = () => {
  const [selectedPlace, setSelectedPlace] =
    useState<google.maps.places.Place | null>(null);

  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        mapId={'49ae42fed52588c3'}
        defaultZoom={3}
        defaultCenter={{lat: 22.54992, lng: 0}}
        gestureHandling={'greedy'}
        disableDefaultUI={true}
        internalUsageAttributionIds={['gmp_git_agentskills_v1']}>

        {/* Example placeholder for an Autocomplete Control */}
        <AutocompleteControl onPlaceSelect={setSelectedPlace} />

      </Map>
    </APIProvider>
  );
};
```

--------------------------------------------------------------------------------

## 2. Zero-Legacy Autocomplete Logic (Custom Hook)

The core logic for fetching suggestions using modern APIs is abstracted into a
reusable custom hook, `useAutocompleteSuggestions`. This hook handles the
loading of the `places` library, managing the required
`AutocompleteSessionToken`, and using the static method
`AutocompleteSuggestion.fetchAutocompleteSuggestions`.

### 2.1 Complete Implementation of `useAutocompleteSuggestions`

This hook encapsulates all best practices for session management, loading state,
and using the modern API data source.

```typescript
import {useEffect, useRef, useState} from 'react';
import {useMapsLibrary} from '@vis.gl/react-google-maps';

export type UseAutocompleteSuggestionsReturn = {
  suggestions: google.maps.places.AutocompleteSuggestion[];
  isLoading: boolean;
  resetSession: () => void;
};

/**
 * A reusable hook that retrieves autocomplete suggestions from the Google Places API.
 * Uses the modern Autocomplete Data API (AutocompleteSuggestion.fetchAutocompleteSuggestions).
 */
export function useAutocompleteSuggestions(
  inputString: string,
  requestOptions: Partial<google.maps.places.AutocompleteRequest> = {}
): UseAutocompleteSuggestionsReturn {
  const placesLib = useMapsLibrary('places');

  // stores the current sessionToken
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  // the suggestions based on the specified input
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);

  // indicates if there is currently an incomplete request to the places API
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!placesLib) return;

    const {AutocompleteSessionToken, AutocompleteSuggestion} = placesLib;

    // CRITICAL: Create a new session token if one does not exist.
    // This token is reused across suggestion requests until a Place is selected.
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new AutocompleteSessionToken();
    }

    const request: google.maps.places.AutocompleteRequest = {
      ...requestOptions,
      input: inputString,
      sessionToken: sessionTokenRef.current
    };

    if (inputString === '') {
      if (suggestions.length > 0) setSuggestions([]);
      return;
    }

    setIsLoading(true);

    // Modern, promise-based API call
    AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
      .then((res: { suggestions: google.maps.places.AutocompleteSuggestion[] }) => {
        setSuggestions(res.suggestions || []);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Error fetching autocomplete suggestions:", err);
        setIsLoading(false);
      });
  }, [placesLib, inputString]);

  return {
    suggestions,
    isLoading,
    // CRITICAL: Session must be reset after a successful fetchFields call on a selected place.
    resetSession: () => {
      sessionTokenRef.current = null;
      setSuggestions([]);
    }
  };
}
```

### 2.2 Session Management Best Practice

It is crucial to understand the lifecycle of the `AutocompleteSessionToken`:

1.  A token is created when the user starts typing (or on the first request).
2.  The *same token* is passed with every suggestion request for that search
    session.
3.  When a user selects a suggestion and details are requested (via
    `place.fetchFields()`), that session is consumed/invalidated.
4.  The application **must** call `resetSession()` to ensure a new token is
    created for the next search session.

--------------------------------------------------------------------------------

## 3. Implementation Pattern 1: Minimal Custom Input

This pattern uses the `useAutocompleteSuggestions` hook to power a standard HTML
input and a custom suggestion list, providing maximum UI control.

### 3.1 Custom Implementation (`autocomplete-custom.tsx`)

Note the sequence: `suggestion.placePrediction.toPlace()` ->
`place.fetchFields()` -> `resetSession()`.

```tsx
import React, {FormEvent, useCallback, useState} from 'react';
import {useMapsLibrary} from '@vis.gl/react-google-maps';
import {useAutocompleteSuggestions} from '../hooks/use-autocomplete-suggestions'; // Assumed from Section 2.1

interface Props {
  onPlaceSelect: (place: google.maps.places.Place | null) => void;
}

export const AutocompleteCustom = ({onPlaceSelect}: Props) => {
  const places = useMapsLibrary('places');

  const [inputValue, setInputValue] = useState<string>('');
  const {suggestions, resetSession} = useAutocompleteSuggestions(inputValue);

  const handleInput = useCallback((event: FormEvent<HTMLInputElement>) => {
    setInputValue((event.target as HTMLInputElement).value);
  }, []);

  const handleSuggestionClick = useCallback(
    async (suggestion: google.maps.places.AutocompleteSuggestion) => {
      if (!places || !suggestion.placePrediction) return;

      // 1. Convert prediction to a full Place object
      const place = suggestion.placePrediction.toPlace();

      // 2. Fetch required Place details (promise-based)
      await place.fetchFields({
        fields: [
          'viewport',
          'location',
          // Note: Fields here must use capitalized acronyms (JS SDK standard)
          'svgIconMaskURI',
          'iconBackgroundColor'
        ]
      });

      setInputValue('');
      onPlaceSelect(place);

      // 3. CRITICAL: Reset the session token after a successful detail fetch
      resetSession();
    },
    [places, onPlaceSelect, resetSession]
  );

  return (
    <div className="autocomplete-container">
      <input
        value={inputValue}
        onInput={event => handleInput(event)}
        placeholder="Search for a place"
      />

      {suggestions.length > 0 && (
        <ul className="custom-list">
          {suggestions.map((suggestion, index) => {
            return (
              <li
                key={index}
                className="custom-list-item"
                onClick={() => handleSuggestionClick(suggestion)}>
                {/* Display the primary text component of the suggestion */}
                {suggestion.placePrediction?.text.text}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
```

### 3.2 Field Casing & Naming Nuance: JS SDK vs. REST API

When using `place.fetchFields()`, pass property names directly **without**
resource prefixes:

-   ✅ **Correct JS SDK (`fetchFields`):** `fields: ['displayName',
    'formattedAddress', 'location', 'viewport', 'websiteURI',
    'svgIconMaskURI']`
-   ❌ **Incorrect (REST prefix):** `fields: ['places.displayName',
    'places.location']` (causes runtime `InvalidValueError`)

| Context | Field Name Format | Prefix Rule | Example Field |
| :--- | :--- | :--- | :--- |
| **JS SDK** (`fetchFields`) | Capitalized Acronyms | **NO prefix** (`'displayName'`, `'location'`) | `formattedAddress`, `websiteURI`, `svgIconMaskURI` |
| **REST API** (HTTP Payload) | camelCase Acronyms | Requires `places.` prefix (`X-Goog-FieldMask: places.displayName`) | `formattedAddress`, `websiteUri`, `svgIconMaskUri` |

--------------------------------------------------------------------------------

## 4. Implementation Pattern 2: Google Maps Web Component (`<gmp-place-autocomplete>`)

For the simplest implementation, the dedicated Google Maps Web Component can be
used. This component manages its own UI and session lifecycle internally,
requiring only a declarative event listener to retrieve the selected place.

### 4.1 Web Component Implementation (`autocomplete-webcomponent.tsx`)

The component must be rendered after ensuring the `places` library is loaded.
Selection is captured via the `ongmp-select` custom event listener.

```tsx
import React from 'react';
import {useMapsLibrary} from '@vis.gl/react-google-maps';

interface Props {
  onPlaceSelect: (place: google.maps.places.Place | null) => void;
}

export const AutocompleteWebComponent = ({onPlaceSelect}: Props) => {
  // CRITICAL: Ensure the '<gmp-place-autocomplete>' component definition is loaded
  useMapsLibrary('places');

  async function handlePlaceSelect(place: google.maps.places.Place) {
    // Even when using the Web Component, fields must still be explicitly fetched
    // if data beyond the basic prediction is required (e.g., location, viewport).
    await place.fetchFields({
      fields: ['displayName', 'formattedAddress', 'location', 'viewport']
    });

    onPlaceSelect(place);
  }

  return (
    <div className="autocomplete-container">
      <gmp-place-autocomplete
        // Use the custom event listener 'ongmp-select'
        ongmp-select={(event: google.maps.places.PlacePredictionSelectEvent) =>
          // Extract the prediction and convert it to a Place object
          void handlePlaceSelect(event.placePrediction.toPlace())
        }
      />
    </div>
  );
};
```

### 4.2 Web Component Best Practice

**Guardrail:** When integrating with Web Components in React, avoid imperatively
setting properties via component refs unless absolutely necessary. Use
declarative event handlers (like `ongmp-select`) to interact with the
component's state and output.

The event object for selection is
`google.maps.places.PlacePredictionSelectEvent`, which contains the
`placePrediction` property. This prediction must still be converted using
`.toPlace()` before detail fields can be fetched.
