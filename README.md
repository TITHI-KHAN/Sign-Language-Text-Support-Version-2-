```markdown
# Sign Language Text Support - Version 2

This project is a web-based sign language text support tool. It displays written text with synchronized sign language video support, helping users access content through multiple formats: text, sentence-level videos, paragraph-level videos, and word-level sign videos.

## Features

- Interactive text support interface
- Sign language video playback
- Word, sentence, and paragraph-level video segments
- CSV/JSON data maps for matching text with signs and timing
- Browser-based app using HTML, CSS, and JavaScript

## Project Structure

```text
├── index.html
├── styles.css
├── app.js
├── data/
│   ├── word_sign_map.csv
│   ├── word_sign_map.json
│   ├── sign_video_map.csv
│   ├── sign_video_map.json
│   ├── word_timing_map.csv
│   └── word_timing_map.json
├── assets/
│   └── words/
├── segments/
│   ├── sentences/
│   └── paragraphs/
├── scripts/
└── video.mp4
```

## How to Run

1. Clone the repository:

```bash
git clone https://github.com/TITHI-KHAN/Sign-Language-Text-Support-Version-2-.git
```

2. Open the project folder:

```bash
cd Sign-Language-Text-Support-Version-2-
```

3. Open `index.html` in a web browser.

You can also run a local server:

```bash
python3 -m http.server
```

Then open:

```text
http://localhost:8000
```

## Data Files

The `data/` folder contains mapping files used by the app:

- `word_sign_map.csv`: maps words to sign video resources
- `sign_video_map.csv`: stores sign video references
- `word_timing_map.csv`: stores timing information for synchronizing text and video

## Media Files

Video files are stored in:

- `assets/words/` for individual word signs
- `segments/sentences/` for sentence-level videos
- `segments/paragraphs/` for paragraph-level videos
- `video.mp4` for the full source video

Large video files are tracked using Git LFS.

## Technologies Used

- HTML
- CSS
- JavaScript
- Python scripts for data/video processing
- Git LFS for large video files

## Author

Nazmun Nahar Khanom
```

You can create a file named `README.md` in the main project folder and paste this there.
