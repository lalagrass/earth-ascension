# V2 共用播放片段的 Godot 版：規則與 ../shared/playback.mjs 相同（同一份 scene.json、固定步進），只是改寫成 GDScript。
class_name Playback
extends RefCounted

const STEP_MS := 1000.0 / 60.0

var pts: Array = []
var seg_len: Array = []
var total := 0.0
var steps: Array = []
var step := 0
var ms := 0.0
var tick := 0
var trips := 0
var vat_level := 1
var rest_after_trip := false
var resting := false

func _init(scene: Dictionary) -> void:
	pts = scene.path.points
	for i in range(1, pts.size()):
		# 不用 Vector2：標準版 Godot 的 Vector2 是單精度，算出的路長和 JS 差 1e-5，位置就對不上
		var dx: float = pts[i][0] - pts[i - 1][0]
		var dy: float = pts[i][1] - pts[i - 1][1]
		var l := sqrt(dx * dx + dy * dy)
		seg_len.append(l)
		total += l
	steps = scene.playback.steps

func at(u: float) -> Dictionary:
	var r: float = clampf(u, 0.0, 1.0) * total
	for i in seg_len.size():
		if r <= seg_len[i] or i == seg_len.size() - 1:
			var k: float = minf(1.0, r / seg_len[i]) if seg_len[i] > 0.0 else 0.0
			return { x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k, dx = pts[i + 1][0] - pts[i][0] }
		r -= seg_len[i]
	return {}

func dur_of(st: Dictionary) -> float:
	return absf(st.to - st.from) * total / st.speed * 1000.0 if st.kind == "walk" else float(st.ms)

func advance() -> void:
	tick += 1
	if resting:
		return
	ms += STEP_MS
	var st: Dictionary = steps[step]
	if ms >= dur_of(st):
		ms -= dur_of(st)
		if st.has("vatLevelAfter"):
			vat_level = int(st.vatLevelAfter)
		if step == steps.size() - 1:
			trips += 1
			if rest_after_trip:
				resting = true
				rest_after_trip = false
				ms = 0.0
				step = 0
				return
		step = (step + 1) % steps.size()
		if step == 0:
			vat_level = 1

func view() -> Dictionary:
	if resting:
		var p0 := at(0.0)
		return { x = p0.x, y = p0.y, face = -1, back = false, frame = "idle", label = "休息（本趟後休息已生效）", progress = 1.0, vat_level = vat_level, trips = trips, resting = true }
	var st: Dictionary = steps[step]
	var k := minf(1.0, ms / dur_of(st))
	if st.kind == "walk":
		var u: float = st.from + (st.to - st.from) * k
		var p := at(u)
		var going_down: bool = st.to > st.from
		var dx: float = p.dx if going_down else -p.dx
		var n := int(floor(ms / st.frameMs)) % 4
		return { x = p.x, y = p.y, face = 1 if dx >= 0.0 else -1, back = not going_down, frame = "%s-%d" % [st.anim, n], label = st.label, progress = k, vat_level = vat_level, trips = trips, resting = false }
	var ph := at(1.0 if step == 1 else 0.0)
	return { x = ph.x, y = ph.y, face = -1 if step == 1 else 1, back = false, frame = st.anim, label = st.label, progress = k, vat_level = vat_level, trips = trips, resting = false }

func order_rest_after_trip() -> String:
	rest_after_trip = true
	return "本趟倒水完成時生效"

func cancel_order() -> void:
	rest_after_trip = false
