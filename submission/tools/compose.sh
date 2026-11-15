#!/usr/bin/env bash
# LUNARSEYE video helper: put the presenters' faces on the slide video, fix the loudness, add captions, export.
# Needs only ffmpeg (6.x tested) and bash (Linux, macOS, Windows with Git Bash or WSL).
#
#   tools/compose.sh pip    slides.mp4 faceA.mp4 faceB.mp4 [faceC.mp4] out.mp4   faces in the bottom-right corner (default; the slides keep that corner clear)
#   tools/compose.sh side   slides.mp4 faceA.mp4 faceB.mp4 out.mp4               slides at 75%, faces in a right-hand column (use if faces must be larger)
#   tools/compose.sh norm   in.mp4 out.mp4                                       loudness to -16 LUFS (two-pass), 48 kHz
#   tools/compose.sh burn   in.mp4 captions.srt out.mp4                          burn captions into the picture
#   tools/compose.sh export in.mp4 final.mp4                                     1080p30 H.264 + AAC, YouTube-friendly
#   tools/compose.sh check  final.mp4                                            duration, size, loudness, reminders
#
# Environment: CAP_MARGIN_R=520 keeps burned-in captions left of the face corner (set 40 for the side layout). DELAY_B=0.35 shifts presenter B's camera+mic by that many seconds (sync clap), DELAY_C likewise.
set -euo pipefail
cmd="${1:-}"; shift || true

# Face corner on a 1920x1080 frame = slide design's reserved zone (x >= 9.8 in of 13.333, y >= 5.7 in of 7.5).
ZX=1411; ZY=821; ZW=509

die() { echo "error: $*" >&2; exit 1; }
need() { command -v "$1" >/dev/null 2>&1 || die "$1 not found. Install ffmpeg first (https://ffmpeg.org)."; }
need ffmpeg; need ffprobe

square() { # $1 = input label, $2 = size, $3 = output label
  echo "[$1]crop='min(iw,ih)':'min(iw,ih)',scale=$2:$2,setsar=1[$3]"
}

case "$cmd" in
  pip)
    [ $# -ge 4 ] || die "usage: pip slides.mp4 faceA.mp4 faceB.mp4 [faceC.mp4] out.mp4"
    slides="$1"; a="$2"; b="$3"
    if [ $# -eq 5 ]; then c="$4"; out="$5"; n=3; else out="$4"; n=2; fi
    t=$((ZW / n))
    inputs=(-i "$slides" -itsoffset 0 -i "$a" -itsoffset "${DELAY_B:-0}" -i "$b")
    [ "$n" -eq 3 ] && inputs+=(-itsoffset "${DELAY_C:-0}" -i "$c")
    fc="[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[bg];"
    fc+="$(square 1:v "$t" fa);$(square 2:v "$t" fb);"
    if [ "$n" -eq 3 ]; then
      fc+="$(square 3:v "$t" fc);[bg][fa]overlay=$ZX:$ZY[t1];[t1][fb]overlay=$((ZX + t)):$ZY[t2];[t2][fc]overlay=$((ZX + 2 * t)):$ZY[v];"
      fc+="[1:a][2:a][3:a]amix=inputs=3:normalize=0:duration=longest[aout]"
    else
      fc+="[bg][fa]overlay=$ZX:$ZY[t1];[t1][fb]overlay=$((ZX + t)):$ZY[v];"
      fc+="[1:a][2:a]amix=inputs=2:normalize=0:duration=longest[aout]"
    fi
    ffmpeg -y -hide_banner "${inputs[@]}" -filter_complex "$fc" -map "[v]" -map "[aout]" \
      -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 48000 -shortest "$out"
    ;;
  side)
    [ $# -eq 4 ] || die "usage: side slides.mp4 faceA.mp4 faceB.mp4 out.mp4"
    slides="$1"; a="$2"; b="$3"; out="$4"
    fc="[0:v]scale=1440:810,setsar=1,pad=1920:1080:0:135:color=0x05070A[bg];"
    fc+="[1:v]crop='min(iw,ih*4/3)':'min(ih,iw*3/4)',scale=480:360,setsar=1[fa];"
    fc+="[2:v]crop='min(iw,ih*4/3)':'min(ih,iw*3/4)',scale=480:360,setsar=1[fb];"
    fc+="[bg][fa]overlay=1440:180[t1];[t1][fb]overlay=1440:540[v];"
    fc+="[1:a][2:a]amix=inputs=2:normalize=0:duration=longest[aout]"
    ffmpeg -y -hide_banner -i "$slides" -i "$a" -itsoffset "${DELAY_B:-0}" -i "$b" -filter_complex "$fc" -map "[v]" -map "[aout]" \
      -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -r 30 -c:a aac -b:a 192k -ar 48000 -shortest "$out"
    ;;
  norm)
    [ $# -eq 2 ] || die "usage: norm in.mp4 out.mp4"
    in="$1"; out="$2"
    stats=$(ffmpeg -hide_banner -nostats -i "$in" -af "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 | sed -n '/^{/,/^}/p')
    get() { echo "$stats" | grep "\"$1\"" | sed 's/.*: *"\{0,1\}\(-\{0,1\}[0-9.]*\).*/\1/'; }
    mi=$(get input_i); mtp=$(get input_tp); mlra=$(get input_lra); mth=$(get input_thresh); off=$(get target_offset)
    [ -n "$mi" ] || die "could not measure loudness (does the file have audio?)"
    echo "measured: I=$mi TP=$mtp LRA=$mlra thresh=$mth offset=$off"
    ffmpeg -y -hide_banner -i "$in" -c:v copy \
      -af "loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=$mi:measured_TP=$mtp:measured_LRA=$mlra:measured_thresh=$mth:offset=$off:linear=true,aresample=48000" \
      -c:a aac -b:a 192k -ar 48000 "$out"
    ;;
  burn)
    [ $# -eq 3 ] || die "usage: burn in.mp4 captions.srt out.mp4"
    in="$1"; srt="$2"; out="$3"
    ffmpeg -y -hide_banner -i "$in" \
      -vf "subtitles='$srt':force_style='FontName=IBM Plex Sans,FontSize=15,Outline=1,Shadow=0,MarginV=40,MarginL=40,MarginR=${CAP_MARGIN_R:-520}'" \
      -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a copy "$out"
    ;;
  export)
    [ $# -eq 2 ] || die "usage: export in.mp4 final.mp4"
    in="$1"; out="$2"
    ffmpeg -y -hide_banner -i "$in" \
      -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30" \
      -c:v libx264 -profile:v high -preset slow -crf 18 -pix_fmt yuv420p -g 15 -bf 2 \
      -c:a aac -b:a 192k -ar 48000 -ac 2 -use_editlist 0 -movflags +faststart "$out"
    ;;
  check)
    [ $# -eq 1 ] || die "usage: check final.mp4"
    f="$1"
    dur=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$f")
    res=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate -of csv=p=0 "$f")
    aud=$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels -of csv=p=0 "$f")
    size=$(du -h "$f" | cut -f1)
    lufs=$(ffmpeg -hide_banner -nostats -i "$f" -af ebur128=peak=true -f null - 2>&1 | grep -A1 "I:" | tail -2 | tr -s ' ' | tr '\n' ' ')
    echo "file      : $f ($size)"
    echo "duration  : $(printf '%d:%02d' "$(echo "$dur / 60" | bc)" "$(echo "$dur % 60 / 1" | bc)") ($dur s)"
    echo "video     : $res  (width,height,fps)"
    echo "audio     : $aud  (codec,rate,channels)"
    echo "loudness  : $lufs"
    awk -v d="$dur" 'BEGIN{ if (d > 420) print "WARNING: longer than 7:00, over the limit"; else if (d > 405) print "note: close to the 7:00 limit"; else if (d < 300) print "note: shorter than the recommended 5:00"; else print "length OK (5:00 to 7:00)" }'
    echo "reminder  : faces of ALL members visible? English? slides visible? open the public link in a private window."
    ;;
  *)
    sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
