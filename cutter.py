import os
import re
import subprocess

# Terminal:
# cd /Users/nazmunnaharkhanom/Documents/GitHub/Video\ Segmentation
# python3 cutter.py

VIDEO_INPUT = "video.mp4"
SENT_DIR = "segments/sentences"
PARA_DIR = "segments/paragraphs"

TITLE_CUE = {
    "start": 5,
    "end": 16.6667,
    "text": "Access Suggestions for Mobilizations",
}

# Source of truth: latest CUES structure from app.js
CUES = [
    {
        "start": 16.6667,
        "end": 40,
        "text": "These recommendations are to be used in addition to/in conjunction with the Access Suggestions for Public Events. This work is ideally done from a deeper political commitment to disability justice, or at least a critique of ableism and an understanding of disabled people’s autonomy and right to consent.",
    },
    {
        "start": 40,
        "end": 64,
        "type": "bullet-group",
        "items": [
            "Know the difference between useful access support and patronizing ableist abuse!",
            "Always have at least one Accessibility Point Person.",
            "Announce them from the mic; have them wear armbands for visibility.",
        ],
    },
    {
        "start": 64,
        "end": 103,
        "text": "Their skills should include a disability justice framework, problem solving, and good listening. Create a clearly marked scent-free area. Have volunteers who can help explain what it is and why it is important. Create large-print and Braille versions of written materials.",
    },
    {
        "start": 103,
        "end": 136,
        "text": "Include important information, such as messaging/chants, route, destinations, National Lawyers Guild phone number, and additional instructions. Use a “sans serif” font for readability. These are fonts without the little “tails” at the edges of the letters.",
    },
    {
        "start": 136,
        "end": 166,
        "text": "OpenDyslexic and Comic Sans are fonts that are more accessible for people who are dyslexic and/or neurodiverse. Use microphones for all instructions or announcements. Provide ASL interpreters stationed at the mic, as well as throughout the crowd if possible.",
    },
    {
        "start": 166,
        "end": 208,
        "text": "Organize and announce from the mic: Availability of manual wheelchairs for people who need them. Low stimulation spaces near the main gathering space such as a room or a tent. Childcare and changing stations, and languages available at the event and how to access them.",
    },
    {
        "start": 208,
        "end": 281,
        "text": "Have people who know what’s happening clearly marked. Have them spread out throughout the mobilization - at the front, middle and back of the march, throughout the four quadrants of the rally, etc. More communication = more information = better access. Provide seating such as folding chairs, mobile bleachers, etc.",
    },
    {
        "start": 281,
        "end": 304,
        "text": "Rent walkie-talkies. Be mindful that police escalation will need to be communicated with participants in a calm manner, and will impact some more than others, particularly Black and brown people, under-documented people, and people with disabilities. Provide seating for rallies/gatherings where people can expect to be standing for any length of time. Announce their location from the mic and explain that they are for people with disabilities, elders, and others who cannot stand for a length of time.",
    },
    {
        "start": 304,
        "end": 359,
        "text": "It is also useful to create an area for D/deaf people to sit together near the interpreter. At a march, do a run-through of the route with mobility in mind ahead of time. Keep an eye out for metal grates, grassy areas, hills, holes, cracks or curbs that will be hard for wheelchairs or scooters. Invite people with disabilities to set the pace of the march by leading it. Let people know that this is happening.",
    },
    {
        "start": 359,
        "end": 477,
        "text": "Station people at the back of the march who are responsible for making sure that nobody gets left behind. Give a verbal description of the march route beforehand. Announce the destination and distance of the route. This lets folks choose to meet the march at its destination. DO NOT “direct” folks with mobility impairments to where you think they should be. Offer respectful suggestions; no one should be hurried along; no one should touch people or their mobility devices without their consent. Organize cars or vans to drive elders and people with disabilities along the route. nclude these vehicles as part of the march, if possible. Provide seating at the destination. Have a team whose sole focus is the safety of the participants. Involve police liaisons.",
    },
    {
        "start": 477,
        "end": 527,
        "text": "Police liaisons should communicate to police that there are participants with disabilities such as elders, pregnant folks, etc. and that the march intends to respect their pace. Be aware that cops will often target folks with disabilities. Cops may perceive folks with disabilities as “weak links”; cops target folks at the end of actions as energy dissipates.",
    },
    {
        "start": 527,
        "end": 555,
        "text": "A note: Since we originally created these suggestions, the landscape in which we exist has shifted. It feels like we have an ever-increasing cascade of horrors facing us on the daily. We have a presidential administration that has proven time and again to be hostile to marginalized communities.",
    },
    {
        "start": 555,
        "end": 585,
        "text": "Furthermore, our planet is experiencing climate chaos and is on the brink of collapse. In these trying times, life is precarious. Dire circumstances require creative strategies and responsive agendas. Much action is needed, and everyone has a role.",
    },
    {
        "start": 585,
        "end": 644,
        "text": "Developing relationships with people with disabilities and asking us what we need is key. Inquire about where your body can be most useful in interrupting fascism, protecting immigrants, closing concentration camps, ending police brutality, honoring Indigenous sovereignty, and safeguarding the future of the planet and all its inhabitants. Invite us, strategize with us, bring all your skills and strengths. Don’t forget us. We are central to this movement and the future we are creating together.",
    },
]


def ensure_dirs() -> None:
    os.makedirs(SENT_DIR, exist_ok=True)
    os.makedirs(PARA_DIR, exist_ok=True)


def split_into_sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]


def ffmpeg_cut(start: float, end: float, output_path: str) -> None:
    duration = max(0, end - start)
    cmd = [
        "ffmpeg",
        "-y",
        "-ss",
        str(start),
        "-t",
        str(duration),
        "-i",
        VIDEO_INPUT,
        "-c",
        "copy",
        output_path,
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)


def sentence_segments_from_cues(cues: list[dict]) -> list[tuple[float, float]]:
    segments = []
    for cue in cues:
        start = cue["start"]
        end = cue["end"]
        raw_blocks = cue.get("items", []) if cue.get("type") == "bullet-group" else [cue["text"]]

        sentence_total = 0
        sentence_counts_by_block = []
        for block in raw_blocks:
            count = len(split_into_sentences(block))
            sentence_counts_by_block.append(count)
            sentence_total += count

        if sentence_total == 0:
            continue

        cue_duration = max(0, end - start)
        per_sentence = cue_duration / sentence_total
        sentence_offset = 0

        for block_count in sentence_counts_by_block:
            for _ in range(block_count):
                sent_start = start + (sentence_offset * per_sentence)
                sentence_offset += 1
                sent_end = end if sentence_offset == sentence_total else start + (sentence_offset * per_sentence)
                segments.append((sent_start, sent_end))

    return segments


def paragraph_segments_from_cues(cues: list[dict]) -> list[tuple[float, float]]:
    # Title + first body cue are one paragraph block in paragraph mode.
    if not cues:
        return []

    return [(TITLE_CUE["start"], cues[0]["end"])] + [
        (cue["start"], cue["end"]) for cue in cues[1:]
    ]


def main() -> None:
    ensure_dirs()
    print("Starting segmentation...")

    sentence_segments = sentence_segments_from_cues([TITLE_CUE] + CUES)
    for i, (start, end) in enumerate(sentence_segments):
        out = os.path.join(SENT_DIR, f"sent_{i}.mp4")
        ffmpeg_cut(start, end, out)
        print(f"Sentence {i}: {start:.3f}-{end:.3f}")

    paragraph_segments = paragraph_segments_from_cues(CUES)
    for i, (start, end) in enumerate(paragraph_segments):
        out = os.path.join(PARA_DIR, f"para_{i}.mp4")
        ffmpeg_cut(start, end, out)
        print(f"Paragraph {i}: {start:.3f}-{end:.3f}")

    print("Done.")
    print(f"Created {len(sentence_segments)} sentence clips and {len(paragraph_segments)} paragraph clips.")


if __name__ == "__main__":
    main()
