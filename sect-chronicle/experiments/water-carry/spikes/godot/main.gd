# SG-EXP-01 V2：Godot 試作。場景（背景、y 排序物件、人物、選取圈）用 Node2D／Sprite2D；HUD、名冊、選單、面板、名牌用 Control。
# 素材與資料只讀 res://shared（tools/sync-assets.sh 從 ../shared 複製），播放規則在 playback.gd。不接正式世界或存檔。
extends Node2D

const PAPER := Color("f8f2e4")
const LINE := Color("cdbb98")
const INK := Color("2f2a24")
const INK2 := Color("6b6254")
const GOLD := Color("c8962e")
const HERO := Color("4f78a8")

@onready var world: Node2D = $World
@onready var sorted: Node2D = $World/Sorted
@onready var marks: Node2D = $World/Marks
@onready var cam: Camera2D = $Camera
@onready var ui_layer: CanvasLayer = $UI
@onready var tags_root: Control = $UI/Tags

var scene: Dictionary
var R := 2.0
var play: Playback
var v: Dictionary
var tex := {}
var hero: Sprite2D
var ring: Node2D
var vat: Sprite2D
var playing := true
var speed := 1
var auto_paused := false
var paused_by_menu := false
var selected := ""
var menu_id := ""
var pending := {}
var roster_open := true
var acc := 0.0
var drag := {}
var frames := 0
var first_frame_ms := -1.0
var t0 := 0

var hud_play: Button
var speed_buttons := {}
var trips_label: Label
var banner: PanelContainer
var menu_box: PanelContainer
var menu_list: VBoxContainer
var menu_title: Label
var panel: PanelContainer
var panel_text: Label
var panel_bar: ProgressBar
var pending_box: HBoxContainer
var pending_label: Label
var roster: HFlowContainer
var cards := {}
var toast: PanelContainer
var toast_label: Label
var toast_left := 0.0
var tag_labels := {}
var _vis_cb

func _ready() -> void:
	t0 = Time.get_ticks_msec()
	scene = JSON.parse_string(FileAccess.get_file_as_string("res://shared/scene.json"))
	R = float(scene.resolution)
	play = Playback.new(scene)
	_build_world()
	_build_ui()
	cam.position = Vector2(scene.camera.start.x, scene.camera.start.y)
	cam.zoom = Vector2.ONE * float(scene.camera.start.zoom)
	_apply_query()
	v = play.view()
	if OS.has_feature("web"):
		_vis_cb = JavaScriptBridge.create_callback(_on_visibility)
		JavaScriptBridge.get_interface("document").addEventListener("visibilitychange", _vis_cb)

func T(file: String) -> Texture2D:
	if not tex.has(file):
		tex[file] = load("res://shared/assets/" + file)
	return tex[file]

func _sprite(file: String, ax: float, ay: float, x: float, y: float) -> Sprite2D:
	var s := Sprite2D.new()
	s.texture = T(file)
	s.centered = false
	s.offset = Vector2(-ax * R, -ay * R)
	s.scale = Vector2.ONE / R
	s.position = Vector2(x, y)
	sorted.add_child(s)
	return s

func _build_world() -> void:
	var bg: Sprite2D = $World/Bg
	bg.texture = T(scene.background)
	bg.scale = Vector2.ONE / R
	for p in scene.props:
		_sprite(p.file, p.ax, p.ay, p.x, p.y)
	var vv: Dictionary = scene.vats[1]
	vat = _sprite(vv.file, vv.ax, vv.ay, scene.places.vat.x, scene.places.vat.y)
	ring = Ring.new()
	ring.visible = false
	sorted.add_child(ring)
	var H: Dictionary = scene.hero
	hero = _sprite(H.frames.idle, H.ax, H.ay, 0, 0)
	marks.draw.connect(_draw_marks)

class Ring extends Node2D:
	func _draw() -> void:
		draw_set_transform(Vector2(0, 2), 0, Vector2(1, 0.3))
		draw_arc(Vector2.ZERO, 30, 0, TAU, 48, Color("c8962e"), 3.0 / 0.3 * 0.35, true)

func _draw_marks() -> void:
	if menu_id == "":
		return
	var pl: Dictionary = scene.places[menu_id]
	marks.draw_set_transform(Vector2(pl.x, pl.y - pl.ry * 0.6), 0, Vector2(1, (pl.ry + 4.0) / (pl.rx + 6.0)))
	marks.draw_arc(Vector2.ZERO, pl.rx + 6.0, 0, TAU, 64, Color(GOLD, 0.9), 3.0, true)

# ---------- UI ----------
func _box(bg := PAPER, radius := 10, pad := 8) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = LINE
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(radius)
	sb.content_margin_left = pad + 2
	sb.content_margin_right = pad + 2
	sb.content_margin_top = pad - 2
	sb.content_margin_bottom = pad - 2
	return sb

func _label(text: String, color := INK, size := 14) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_color_override("font_color", color)
	l.add_theme_font_size_override("font_size", size)
	return l

func _button(text: String) -> Button:
	var b := Button.new()
	b.text = text
	b.focus_mode = Control.FOCUS_NONE
	b.add_theme_stylebox_override("normal", _box(Color("fffaf0"), 6, 4))
	b.add_theme_stylebox_override("hover", _box(Color("fff6e0"), 6, 4))
	b.add_theme_stylebox_override("pressed", _box(INK, 6, 4))
	b.add_theme_color_override("font_color", INK)
	b.add_theme_color_override("font_pressed_color", Color.WHITE)
	b.add_theme_color_override("font_hover_pressed_color", Color.WHITE)
	return b

func _build_ui() -> void:
	var hud := PanelContainer.new()
	hud.add_theme_stylebox_override("panel", _box(Color(PAPER, 0.94)))
	hud.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE, Control.PRESET_MODE_MINSIZE, 10)
	ui_layer.add_child(hud)
	var row := HFlowContainer.new() # 窄螢幕時換行，對應 Pixi 版 flex-wrap
	row.add_theme_constant_override("h_separation", 6)
	row.add_theme_constant_override("v_separation", 4)
	hud.add_child(row)
	row.add_child(_label("宗門編年"))
	row.add_child(_label("V2 · Godot", INK2, 12))
	hud_play = _button("暫停")
	hud_play.pressed.connect(_toggle_play)
	row.add_child(hud_play)
	for s in [1, 2, 4]:
		var b := _button("%d×" % s)
		b.toggle_mode = true
		b.pressed.connect(_set_speed.bind(s))
		speed_buttons[s] = b
		row.add_child(b)
	row.add_child(_label("播放倍率", INK2, 12))
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(sp)
	trips_label = _label("今日已挑 0 趟")
	row.add_child(trips_label)
	var rb := _button("名冊")
	rb.pressed.connect(_toggle_roster)
	row.add_child(rb)

	banner = PanelContainer.new()
	banner.add_theme_stylebox_override("panel", _box(INK, 999, 4))
	banner.add_child(_label("已暫停　選單開著時世界不前進；下令或按 Esc 關閉", Color("f6e7c4"), 13))
	banner.set_anchors_preset(Control.PRESET_CENTER_TOP)
	banner.grow_horizontal = Control.GROW_DIRECTION_BOTH
	banner.offset_top = 62
	banner.visible = false
	ui_layer.add_child(banner)

	menu_box = PanelContainer.new()
	menu_box.add_theme_stylebox_override("panel", _box())
	menu_box.custom_minimum_size = Vector2(300, 0)
	menu_box.visible = false
	var mv := VBoxContainer.new()
	menu_box.add_child(mv)
	menu_title = _label("", INK, 16)
	mv.add_child(menu_title)
	mv.add_child(_label("對象：主角 · %s（腳力 %s）" % [scene.ui.hero.name, scene.ui.hero.leg], INK2, 12))
	menu_list = VBoxContainer.new()
	mv.add_child(menu_list)
	mv.add_child(_label("↑↓ 選擇　Enter 下令　Esc 關閉", INK2, 12))
	ui_layer.add_child(menu_box)

	panel = PanelContainer.new()
	panel.add_theme_stylebox_override("panel", _box())
	panel.custom_minimum_size = Vector2(280, 0)
	panel.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	panel.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	panel.offset_right = -10
	panel.offset_top = 70
	panel.visible = false
	var pv := VBoxContainer.new()
	panel.add_child(pv)
	pv.add_child(_label("%s  %s" % [scene.ui.hero.name, scene.ui.hero.role], INK, 16))
	panel_text = _label("")
	pv.add_child(panel_text)
	panel_bar = ProgressBar.new()
	panel_bar.show_percentage = false
	panel_bar.custom_minimum_size = Vector2(0, 6)
	pv.add_child(panel_bar)
	pv.add_child(_label("待執行指令", INK2, 13))
	pending_box = HBoxContainer.new()
	pending_label = _label("沒有", INK2, 13)
	pending_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	pending_box.add_child(pending_label)
	var cancel := _button("取消")
	cancel.pressed.connect(func(): play.cancel_order(); pending = {}; _render_chrome())
	pending_box.add_child(cancel)
	pv.add_child(pending_box)
	ui_layer.add_child(panel)

	roster = HFlowContainer.new() # 跨滿底部寬度，窄螢幕時名冊卡換行
	roster.add_theme_constant_override("h_separation", 8)
	roster.add_theme_constant_override("v_separation", 8)
	roster.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	roster.grow_vertical = Control.GROW_DIRECTION_BEGIN
	roster.offset_left = 10
	roster.offset_right = -10
	roster.offset_bottom = -34
	roster.mouse_filter = Control.MOUSE_FILTER_IGNORE # 空白處的點擊交給場景
	ui_layer.add_child(roster)
	for p in scene.ui.people:
		var c := _button(p.name)
		c.alignment = HORIZONTAL_ALIGNMENT_LEFT
		c.custom_minimum_size = Vector2(150, 0)
		c.pressed.connect(func(): _select("" if selected == p.id else p.id))
		cards[p.id] = c
		roster.add_child(c)

	toast = PanelContainer.new()
	toast.add_theme_stylebox_override("panel", _box(INK, 6, 4))
	toast_label = _label("", Color("f6e7c4"))
	toast.add_child(toast_label)
	toast.visible = false
	ui_layer.add_child(toast)

	var hint := _label("點人物看他在做什麼；點水缸或泉水下令（會自動暫停）· 拖曳平移 · 滾輪或 +/- 縮放 · 0 重設", INK2, 12)
	hint.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	hint.grow_vertical = Control.GROW_DIRECTION_BEGIN
	hint.offset_left = 10
	hint.offset_bottom = -8
	ui_layer.add_child(hint)
	_render_chrome()

# ---------- 鏡頭與命中 ----------
func _to_world(sp: Vector2) -> Vector2:
	return get_viewport().get_canvas_transform().affine_inverse() * sp

func _to_screen(wp: Vector2) -> Vector2:
	return get_viewport().get_canvas_transform() * wp

func _clamp_cam() -> void:
	cam.position = cam.position.clamp(Vector2.ZERO, Vector2(scene.size.w, scene.size.h))

func _zoom_at(sp: Vector2, z: float) -> void:
	var before := _to_world(sp)
	cam.zoom = Vector2.ONE * clampf(z, scene.camera.minZoom, scene.camera.maxZoom)
	var vp := get_viewport_rect().size
	var after := cam.position + (sp - vp / 2) / cam.zoom.x
	cam.position += before - after
	_clamp_cam()

func _hit(sp: Vector2) -> Dictionary:
	var p := _to_world(sp)
	if p.x >= v.x - 20 and p.x <= v.x + 20 and p.y >= v.y - 78 and p.y <= v.y + 4:
		return { kind = "person", id = "hero" }
	for id in scene.places:
		var pl: Dictionary = scene.places[id]
		var dx: float = (p.x - pl.x) / pl.rx
		var dy: float = (p.y - (pl.y - pl.ry * 0.6)) / (pl.ry * 1.6)
		if dx * dx + dy * dy <= 1.0:
			return { kind = "place", id = id }
	return {}

func _unhandled_input(e: InputEvent) -> void:
	if e is InputEventMouseButton:
		if e.button_index == MOUSE_BUTTON_WHEEL_UP and e.pressed:
			_zoom_at(e.position, cam.zoom.x * 1.1)
		elif e.button_index == MOUSE_BUTTON_WHEEL_DOWN and e.pressed:
			_zoom_at(e.position, cam.zoom.x / 1.1)
		elif e.button_index == MOUSE_BUTTON_LEFT:
			if e.pressed:
				drag = { start = e.position, cam = cam.position, moved = false }
			elif not drag.is_empty():
				var was_drag: bool = drag.moved
				drag = {}
				if not was_drag:
					_click(e.position)
	elif e is InputEventMouseMotion and not drag.is_empty():
		var d: Vector2 = e.position - drag.start
		if absf(d.x) + absf(d.y) > 5:
			drag.moved = true
		if drag.moved:
			cam.position = drag.cam - d / cam.zoom.x
			_clamp_cam()

func _click(sp: Vector2) -> void:
	var h := _hit(sp)
	if h.is_empty():
		if menu_id != "":
			_close_menu()
		return
	if h.kind == "person":
		_select("" if selected == h.id else h.id)
	else:
		_open_menu(h.id)

func _input(e: InputEvent) -> void:
	if not (e is InputEventKey and e.pressed and not e.echo):
		return
	var k: int = e.keycode
	if k == KEY_ESCAPE and menu_id != "":
		_close_menu()
		get_viewport().set_input_as_handled()
		return
	if menu_id != "":
		return # 選單開著時方向鍵／Enter 交給按鈕的焦點移動
	match k:
		KEY_SPACE: _toggle_play()
		KEY_1: _set_speed(1)
		KEY_2: _set_speed(2)
		KEY_4: _set_speed(4)
		KEY_EQUAL, KEY_PLUS, KEY_KP_ADD: _zoom_at(get_viewport_rect().size / 2, cam.zoom.x * 1.1)
		KEY_MINUS, KEY_KP_SUBTRACT: _zoom_at(get_viewport_rect().size / 2, cam.zoom.x / 1.1)
		KEY_0:
			cam.position = Vector2(scene.camera.start.x, scene.camera.start.y)
			cam.zoom = Vector2.ONE
		KEY_LEFT, KEY_RIGHT, KEY_UP, KEY_DOWN:
			var s := 40.0 / cam.zoom.x
			cam.position += Vector2(-s if k == KEY_LEFT else (s if k == KEY_RIGHT else 0.0), -s if k == KEY_UP else (s if k == KEY_DOWN else 0.0))
			_clamp_cam()
		KEY_R: _toggle_roster()
		KEY_ENTER:
			if selected == "hero":
				_open_menu("vat")
		_: return
	get_viewport().set_input_as_handled()

func _on_visibility(_args) -> void:
	if JavaScriptBridge.eval("document.hidden", true) and playing:
		playing = false
		auto_paused = true
		paused_by_menu = false
	_render_chrome()

# ---------- 操作 ----------
func _toggle_play() -> void:
	if menu_id != "":
		_close_menu(false)
	playing = not playing
	auto_paused = false
	paused_by_menu = false
	acc = 0.0
	_render_chrome()

func _set_speed(s: int) -> void:
	speed = s
	_render_chrome()

func _toggle_roster() -> void:
	roster_open = not roster_open
	_render_chrome()

func _select(id: String) -> void:
	selected = id
	_render_chrome()

func _open_menu(id: String) -> void:
	if playing:
		playing = false
		paused_by_menu = true
	menu_id = id
	var pl: Dictionary = scene.places[id]
	menu_title.text = "%s　%s" % [pl.label, pl.sub]
	for c in menu_list.get_children():
		c.queue_free()
	var first: Button = null
	var i := 0
	for o in scene.ui.menus[id]:
		var b := Button.new()
		b.text = "%s\n%s" % [o.label, o.detail]
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.disabled = not o.enabled
		b.add_theme_stylebox_override("normal", StyleBoxEmpty.new())
		b.add_theme_stylebox_override("hover", _box(Color("fff6e0"), 6, 4))
		var fb := _box(Color(0, 0, 0, 0), 6, 4) # focus 框畫在文字上面，底色必須透明
		fb.border_color = GOLD
		b.add_theme_stylebox_override("focus", fb)
		b.add_theme_stylebox_override("disabled", StyleBoxEmpty.new())
		for c in ["font_color", "font_focus_color", "font_hover_color", "font_pressed_color", "font_hover_pressed_color"]:
			b.add_theme_color_override(c, INK) # 預設主題的 focus/hover 字色是近白色，淺底上會整行看不見
		b.add_theme_color_override("font_disabled_color", Color("9a917f"))
		b.pressed.connect(_order.bind(id, i))
		menu_list.add_child(b)
		if o.enabled and first == null:
			first = b
		i += 1
	menu_box.visible = true
	if first:
		first.call_deferred("grab_focus")
	_place_menu()
	marks.queue_redraw()
	_render_chrome()

func _place_menu() -> void:
	if menu_id == "":
		return
	var pl: Dictionary = scene.places[menu_id]
	var s := _to_screen(Vector2(pl.x, pl.y))
	var vp := get_viewport_rect().size
	var sz := menu_box.get_combined_minimum_size()
	menu_box.position = Vector2(clampf(s.x + 40, 10, vp.x - sz.x - 10), clampf(s.y - sz.y / 2, 60, vp.y - sz.y - 40))

func _close_menu(resume := true) -> void:
	menu_id = ""
	menu_box.visible = false
	if resume and paused_by_menu:
		playing = true
		acc = 0.0
	paused_by_menu = false
	marks.queue_redraw()
	_render_chrome()

func _order(place_id: String, i: int) -> void:
	var o: Dictionary = scene.ui.menus[place_id][i]
	var when := play.order_rest_after_trip()
	pending = { label = o.label, when = when }
	_toast("已下令：%s（%s）" % [o.label, when])
	selected = "hero"
	_close_menu()

func _toast(text: String) -> void:
	toast_label.text = text
	toast.visible = true
	toast_left = 2.5

func _render_chrome() -> void:
	if hud_play == null:
		return
	hud_play.text = "暫停" if playing else "繼續" # 子集字型沒有 ❚ ▶，Godot 不會退回系統字型
	for s in speed_buttons:
		speed_buttons[s].button_pressed = s == speed
	banner.visible = menu_id != ""
	trips_label.text = "今日已挑 %d 趟" % v.get("trips", 0)
	for p in scene.ui.people:
		var st: String = ("%s・%s" % ["休息" if v.get("resting", false) else "挑水", v.get("label", "")]) if p.id == "hero" else p.status
		var extra := "\n待執行 1" if p.id == "hero" and not pending.is_empty() else ""
		var c: Button = cards[p.id]
		var text := "%s\n%s%s" % [p.name, st, extra]
		if c.text != text:
			c.text = text
		c.add_theme_stylebox_override("normal", _box(Color(PAPER, 0.94), 8, 4) if selected != p.id else _sel_box())
		c.visible = roster_open or selected == p.id
	panel.visible = selected == "hero"
	if panel.visible:
		panel_text.text = "目前工作\n%s · 第 %d 趟\n%s" % ["休息" if v.get("resting", false) else scene.ui.hero.work, v.get("trips", 0) + 1, v.get("label", "")]
		panel_bar.value = v.get("progress", 0.0) * 100.0
		pending_label.text = ("%s\n%s" % [pending.label, pending.when]) if not pending.is_empty() else "沒有"
		pending_box.get_child(1).visible = not pending.is_empty()

func _sel_box() -> StyleBoxFlat:
	var sb := _box(Color(PAPER, 0.94), 8, 4)
	sb.border_color = GOLD
	sb.set_border_width_all(2)
	return sb

func _tag(id: String, text: String, wp: Vector2, dy := 0.0, bg := Color(PAPER, 0.9), fg := INK, center_y := false) -> void:
	var l: Label = tag_labels.get(id)
	if l == null:
		l = _label(text, fg, 12)
		var sb := _box(bg, 4, 2)
		sb.content_margin_top = 0
		sb.content_margin_bottom = 0
		l.add_theme_stylebox_override("normal", sb)
		tags_root.add_child(l)
		tag_labels[id] = l
	if l.text != text:
		l.text = text
	(l.get_theme_stylebox("normal") as StyleBoxFlat).bg_color = bg
	l.add_theme_color_override("font_color", fg)
	var s := _to_screen(wp)
	var sz := l.get_combined_minimum_size()
	l.position = Vector2(round(s.x - sz.x / 2), round(s.y + dy - (sz.y if center_y else 0.0)))

# ---------- 每幀 ----------
func _process(delta: float) -> void:
	if playing:
		acc += minf(250.0, delta * 1000.0) * speed # 單幀長空檔只算上限，不追趕
		while acc >= Playback.STEP_MS:
			play.advance()
			acc -= Playback.STEP_MS
	var prev_trips: int = v.get("trips", 0)
	var prev_resting: bool = v.get("resting", false)
	v = play.view()
	if v.resting and not prev_resting:
		pending = {}
	var H: Dictionary = scene.hero
	var key: String = v.frame + ("-sel" if selected == "hero" else "")
	hero.texture = T(H.frames.get(key, H.frames.idle))
	hero.scale = Vector2((-1.0 if v.face < 0 else 1.0) / R, 1.0 / R)
	hero.position = Vector2(v.x, v.y)
	ring.visible = selected == "hero"
	ring.position = Vector2(v.x, v.y - 0.01)
	vat.texture = T(scene.vats[v.vat_level].file)
	_tag("vat", scene.places.vat.label, Vector2(scene.places.vat.x, scene.places.vat.y - 60), 0, Color(PAPER, 0.9), INK, true)
	_tag("spring", scene.places.spring.label, Vector2(scene.places.spring.x, scene.places.spring.y - 40), 0, Color(PAPER, 0.9), INK, true)
	_tag("hero", "主角", Vector2(v.x, v.y), 6, GOLD if selected == "hero" else HERO, Color.WHITE)
	_tag("pill", "%s %d%%" % [v.label, roundi(v.progress * 100)], Vector2(v.x, v.y - 80), 0, Color(INK, 0.88), Color("f6e7c4"), true)
	_tag("master", "師父 · 打坐", Vector2(1300, 512), 6)
	_tag("senior", "師兄 · 掃地", Vector2(1120, 528), 6)
	_place_menu()
	if toast.visible:
		toast_left -= delta
		toast.visible = toast_left > 0
		var vp := get_viewport_rect().size
		toast.position = Vector2((vp.x - toast.size.x) / 2, vp.y - 96 - toast.size.y)
	if prev_trips != v.trips or frames % 15 == 0:
		_render_chrome()
	frames += 1
	if first_frame_ms < 0:
		first_frame_ms = Time.get_ticks_msec() - t0
	if OS.has_feature("web") and frames % 3 == 0:
		_publish()

# 給自動檢查讀的唯讀狀態（不改世界）：寫到 window.spikeState
func _publish() -> void:
	var hs := _to_screen(Vector2(v.x, v.y))
	var vs := _to_screen(Vector2(scene.places.vat.x, scene.places.vat.y - 20))
	var ss := _to_screen(Vector2(scene.places.spring.x, scene.places.spring.y - 10))
	var st := { engine = "godot", tick = play.tick, x = v.x, y = v.y, frame = v.frame, face = v.face, label = v.label, trips = v.trips, resting = v.resting,
		playing = playing, autoPaused = auto_paused, speed = speed, selected = selected if selected != "" else null, menu = menu_id if menu_id != "" else null,
		pending = pending if not pending.is_empty() else null, cam = { x = cam.position.x, y = cam.position.y, zoom = cam.zoom.x },
		heroScreen = { x = hs.x, y = hs.y - 40 }, vatScreen = { x = vs.x, y = vs.y }, springScreen = { x = ss.x, y = ss.y }, frames = frames, firstFrameMs = first_frame_ms }
	JavaScriptBridge.eval("window.spikeState=" + JSON.stringify(st), true)

func _apply_query() -> void:
	# ?at=<tick>：先推進到指定 tick 並暫停，用來和 PixiJS 版同一時刻截圖比較
	if not OS.has_feature("web"):
		return
	var q: String = JavaScriptBridge.eval("location.search", true)
	var m := RegEx.create_from_string("[?&]at=(\\d+)").search(q)
	if m:
		for _i in int(m.get_string(1)):
			play.advance()
		playing = false
