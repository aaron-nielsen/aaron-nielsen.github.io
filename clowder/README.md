# The Clowder

Standalone family cat website, migrated from Sites.

Direct URL: https://aaron-nielsen.github.io/clowder/

Intentionally absent from the main website navigation. The HTML requests no indexing; this is an unlisted public page, not password-protected.

Serve this directory over HTTP to preview; app.js loads the local JSON files.

Update measurements in prepare-data.py, then run python prepare-data.py and python smooth-weights.py (NumPy and SciPy required). The latter fits cubic smoothing splines with GCV; birthday-zero references are displayed separately.

Images are supplied family photographs. Main profile data and photos are mapped in app.js.
