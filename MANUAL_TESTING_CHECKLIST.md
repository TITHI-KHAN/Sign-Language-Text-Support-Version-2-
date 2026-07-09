# Manual Testing Checklist

Use this checklist after navigation, highlighting, underline, timestamp, or popup changes.

## Setup

- [ ] Open `index.html` in a local server.
- [ ] Open the ASL support tool sidebar.
- [ ] Confirm the video location can be set to `Popup`.
- [ ] Confirm the video location can be set to `Side`.

## Core Navigation Behaviors

- [ ] Interactive Video mode works again.
- [ ] Both mode works after Interactive Video is fixed.
- [ ] Interactive Text click jumps video.
- [ ] Interactive Text highlight disappears after about 500ms.
- [ ] Interactive Text highlight does not move with video.
- [ ] Interactive Video text is not clickable for navigation inside the selected segment.
- [ ] Interactive Video highlight moves with video.
- [ ] Interactive Video uses no fixed timer for moving highlights.
- [ ] Both mode allows text clicking.
- [ ] Both mode highlight moves with video after click.

## Segmentation And Linking Combinations

### Sentence Video Segmentation, Word Linking

- [ ] Sentence -> Word behavior works.
- [ ] Interactive Text: clicking a word starts the sentence video from that word timestamp onward.
- [ ] Interactive Text: clicked word highlights briefly, then clears after about 500ms.
- [ ] Interactive Text: highlight does not continue moving with video playback.
- [ ] Interactive Video: user selects only the full sentence video segment.
- [ ] Interactive Video: words inside the selected sentence are not clickable for navigation.
- [ ] Interactive Video: word highlight moves with video playback.
- [ ] Both: clicking a word jumps the sentence video to that word timestamp.
- [ ] Both: word highlight continues moving with video playback after the click.
- [ ] Word links inside sentence videos jump to timestamps, not separate word videos.

### Paragraph Video Segmentation, Sentence Linking

- [ ] Paragraph -> Sentence behavior works.
- [ ] Interactive Text: clicking a sentence starts the paragraph video from that sentence timestamp onward.
- [ ] Interactive Text: clicked sentence highlights briefly, then clears after about 500ms.
- [ ] Interactive Video: user selects only the full paragraph video segment.
- [ ] Interactive Video: sentences inside the selected paragraph are not clickable for navigation.
- [ ] Interactive Video: sentence highlight moves with video playback.
- [ ] Both: clicking a sentence jumps the paragraph video to that sentence timestamp.
- [ ] Both: sentence highlight continues moving with video playback after the click.

### Paragraph Video Segmentation, Word Linking

- [ ] Paragraph -> Word behavior works.
- [ ] Interactive Text: clicking a word starts the paragraph video from that word timestamp onward.
- [ ] Interactive Text: clicked word highlights briefly, then clears after about 500ms.
- [ ] Interactive Video: user selects only the full paragraph video segment.
- [ ] Interactive Video: words inside the selected paragraph are not clickable for navigation.
- [ ] Interactive Video: word highlight moves with video playback.
- [ ] Both: clicking a word jumps the paragraph video to that word timestamp.
- [ ] Both: word highlight continues moving with video playback after the click.
- [ ] Word links inside paragraph videos jump to timestamps, not separate word videos.

### Full Text Video Segmentation, Paragraph Linking

- [ ] Full Text -> Paragraph behavior works.
- [ ] Interactive Text: clicking a paragraph starts the full-text video from that paragraph timestamp onward.
- [ ] Interactive Text: clicked paragraph highlights briefly, then clears after about 500ms.
- [ ] Interactive Video: full-text video plays and paragraph highlight moves with video playback.
- [ ] Both: clicking a paragraph jumps the full-text video to that paragraph timestamp.
- [ ] Both: paragraph highlight continues moving with video playback after the click.
- [ ] Paragraph links inside the full-text video jump to timestamps, not separate videos.

## Dotted Underline Scope

- [ ] Dotted underline appears only in the active scope.
- [ ] If video segmentation is `Sentence`, only linked units inside the active sentence show dotted underline.
- [ ] If video segmentation is `Paragraph`, only linked units inside the active paragraph show dotted underline.
- [ ] If video segmentation is `Full Text`, linked units may appear throughout the full transcript scope.
- [ ] Linking granularity does not add dotted underlines to unrelated sentences or paragraphs outside the active scope.

## Timestamp Navigation

- [ ] Word links inside sentence videos jump to timestamps, not separate videos.
- [ ] Word links inside paragraph videos jump to timestamps, not separate videos.
- [ ] Paragraph links inside full-text videos jump to timestamps, not separate videos.
- [ ] Separate individual word videos are used only when video segmentation is `Word` and linking granularity is `Word`.

## Moving Highlights

- [ ] Interactive Video highlight remains only while the linked unit is active in video playback.
- [ ] Interactive Video highlight moves to the next linked unit when playback reaches the next unit timestamp.
- [ ] Both mode highlight remains active after a text click and moves with video playback.
- [ ] Interactive Text highlight never follows playback after the brief click highlight clears.

## Draggable Popup

- [ ] Popup video can be dragged and repositioned.
- [ ] Popup stays where the user drops it.
- [ ] Dragging the popup does not accidentally pause or play the video.
- [ ] Video controls remain usable after the popup is moved.
- [ ] Close button still works after the popup is moved.
- [ ] Popup dragging works in Interactive Text.
- [ ] Popup dragging works in Interactive Video.
- [ ] Popup dragging works in Both.
