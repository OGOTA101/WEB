shader_type canvas_item;

uniform float shake_power : hint_range(0.0, 1.0) = 0.0;
uniform float color_aberration : hint_range(0.0, 1.0) = 0.0;
uniform sampler2D screen_texture : hint_screen_texture, repeat_disable, filter_nearest;

float rand(vec2 co) {
	return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void fragment() {
	vec2 uv = SCREEN_UV;
	
	if (shake_power > 0.0) {
		uv.x += (rand(uv + vec2(TIME)) - 0.5) * shake_power * 0.1;
		uv.y += (rand(uv + vec2(TIME + 1.0)) - 0.5) * shake_power * 0.1;
	}
	
	vec4 col = texture(screen_texture, uv);
	
	if (color_aberration > 0.0) {
		float offset = color_aberration * 0.05;
		col.r = texture(screen_texture, uv + vec2(offset, 0.0)).r;
		col.b = texture(screen_texture, uv - vec2(offset, 0.0)).b;
	}
	
	COLOR = col;
	COLOR.a = shake_power > 0.0 ? 1.0 : 0.0;
}
