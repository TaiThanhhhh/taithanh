/**
 * @file Environmental State Engine, Object Interaction Matrix, and Effect Variations Catalog.
 *
 * Provides a unified physical and atmospheric bus shared across both Ambient Mode
 * and Static Screen Atmosphere (#header):
 *  - Shared Dynamic Wind Vector (speed, gust, turbulence) influencing clouds, smoke, petals, rain, kites, boids.
 *  - Atmospheric Illumination & Flash Bus (lightning, large fireworks bursts, laser sweeps) reflecting on skyline & clouds.
 *  - Disturbance & Flocking Reactions (startle waves on boids, birds, and bats).
 *  - Multi-stage Cascading Event Sequences (storms, celebrations, sunsets).
 *  - Comprehensive Catalog of 250+ distinct Effect Variations with verified behavioral taxonomy.
 */
(function (Portfolio) {
  'use strict';

  /* ---------- 1. Dynamic Wind Vector Engine ---------- */

  class WindEngine {
    constructor() {
      this.baseSpeed = 0.6; // px per frame at 60fps (positive = blowing eastward/right)
      this.currentSpeed = 0.6;
      this.targetSpeed = 0.6;
      this.gust = 0;
      this.gustDecay = 0.96;
      this.turbulence = 0;
      this.time = 0;
    }

    tick(dt = 0.016) {
      this.time += dt;
      // Gentle natural oscillation of wind speed
      this.turbulence = Math.sin(this.time * 0.4) * 0.25 + Math.sin(this.time * 1.3) * 0.12;

      // Decay active gusts
      if (Math.abs(this.gust) > 0.01) {
        this.gust *= Math.pow(this.gustDecay, dt * 60);
      } else {
        this.gust = 0;
      }

      // Smooth approach to target speed
      this.currentSpeed += (this.targetSpeed - this.currentSpeed) * Math.min(dt * 2, 1);
    }

    /**
     * Gets the effective horizontal wind force at a given altitude y (0 = top of sky, 1 = ground).
     * Wind is typically faster and more turbulent higher in the atmosphere.
     * @param {number} [altitudeNorm=0.5] 0..1
     * @returns {number}
     */
    sample(altitudeNorm = 0.5) {
      const altitudeFactor = 1.4 - altitudeNorm * 0.6; // 1.4x at zenith, 0.8x at ground
      return (this.currentSpeed + this.gust + this.turbulence) * altitudeFactor;
    }

    triggerGust(strength = 1.8) {
      this.gust = strength;
    }

    setWind(speed, target = speed) {
      this.currentSpeed = speed;
      this.targetSpeed = target;
    }

    reset() {
      this.currentSpeed = 0.6;
      this.targetSpeed = 0.6;
      this.gust = 0;
      this.turbulence = 0;
    }
  }

  /* ---------- 2. Atmospheric Illumination & Flash Bus ---------- */

  class IlluminationBus {
    constructor() {
      this.flashIntensity = 0;
      this.flashColor = [255, 255, 255];
      this.flashDecay = 0.9;
    }

    /**
     * Triggers an atmospheric light flash (from lightning, fireworks, laser pulses).
     * @param {number} intensity 0..1
     * @param {number[]} [color=[255,255,255]] [r, g, b]
     * @param {number} [decayRate=0.88] Exponential decay per frame
     */
    flash(intensity, color = [255, 255, 255], decayRate = 0.88) {
      this.flashIntensity = Math.min(1, Math.max(this.flashIntensity, intensity));
      this.flashColor = color;
      this.flashDecay = decayRate;

      // Flash also notifies the static screen atmosphere
      Portfolio.screenAtmosphere?.onAtmosphericFlash?.(this.flashIntensity, this.flashColor);
    }

    tick(dt = 0.016) {
      if (this.flashIntensity > 0.005) {
        this.flashIntensity *= Math.pow(this.flashDecay, dt * 60);
      } else {
        this.flashIntensity = 0;
      }
    }

    getFlash() {
      return {
        intensity: this.flashIntensity,
        color: this.flashColor,
      };
    }
  }

  /* ---------- 3. Object-to-Object Interaction Matrix ---------- */

  const INTERACTION_MATRIX = [
    {
      id: 'int_wind_smoke_drift',
      source: 'Wind Engine',
      target: 'Fireworks Smoke / Contrails',
      description:
        'Khói pháo hoa và vệt khói máy bay bị gió thổi dạt nghiêng và tản mờ theo vận tốc gió thực tế.',
    },
    {
      id: 'int_wind_cloud_accel',
      source: 'Wind Engine',
      target: 'Cloud Formations',
      description:
        'Mây tầng cao và mây tích thay đổi tốc độ trôi và độ biến dạng tỷ lệ thuận với tốc độ gió.',
    },
    {
      id: 'int_wind_petal_flutter',
      source: 'Wind Engine',
      target: 'Mai Petals / Flying Seeds',
      description:
        'Cánh hoa mai và hoa dầu lốc xoáy bị gió giật nâng độ cao và xoay tít theo chu kỳ khí động học.',
    },
    {
      id: 'int_wind_kite_tilt',
      source: 'Wind Engine',
      target: 'Kites (Thủ Thiêm)',
      description: 'Cánh diều căng dây và chao liệng góc nghiêng con lắc theo xung lực gió giật.',
    },
    {
      id: 'int_wind_rain_slant',
      source: 'Wind Engine',
      target: 'Precipitation Streaks',
      description:
        'Hạt mưa bị tạt xiên góc theo vận tốc gió ngang, tạo cảm giác giông bão nhiệt đới thực thụ.',
    },
    {
      id: 'int_wind_paperplane_bank',
      source: 'Wind Engine',
      target: 'Paper Airplane',
      description: 'Máy bay giấy lượn sóng nhấp nhô, gặp gió ngược thì ngóc đầu, xuôi gió thì lao vút.',
    },
    {
      id: 'int_lightning_cloud_flash',
      source: 'Lightning Discharge',
      target: 'Cloud Banks & Skyline',
      description:
        'Tia sét làm bừng sáng tán mây xung quanh và tạo bóng tương phản cao trên đường chân trời.',
    },
    {
      id: 'int_lightning_silhouette_pop',
      source: 'Lightning Discharge',
      target: 'Landmark 81 & Bitexco',
      description:
        'Ánh chớp chiếu ngược từ phía sau làm nổi bật viền silhouette của các tòa tháp biểu tượng.',
    },
    {
      id: 'int_lightning_startle_boids',
      source: 'Lightning / Thunder',
      target: 'Boids Swarm & Bird Flocks',
      description: 'Sấm chớp làm đàn boids và đàn chim giật mình tản mác hỗn loạn trước khi tụ họp lại.',
    },
    {
      id: 'int_firework_illum_sky',
      source: 'Fireworks Explosions',
      target: 'Ambient Sky Canvas',
      description: 'Vòm pháo hoa bung nổ phát ra ánh sáng tỏa làm sáng bầu trời đêm theo màu sắc của pháo.',
    },
    {
      id: 'int_firework_river_reflect',
      source: 'Fireworks Shells',
      target: 'Saigon River Water Surface',
      description: 'Ánh sáng pháo hoa tầm cao in bóng vệt thẳng đứng lung linh trên mặt sông Sài Gòn.',
    },
    {
      id: 'int_firework_startle_flock',
      source: 'Grand Fireworks Show',
      target: 'Murmuration Swarm',
      description: 'Sóng xung kích từ đợt pháo hoa đại tiệc làm đàn con trỏ rung chấn và dạt ra xa tâm nổ.',
    },
    {
      id: 'int_sun_cloud_shadow',
      source: 'Moving Clouds',
      target: 'Ground Sunlight & Static Screen',
      description:
        'Đám mây dày trôi qua che khuất mặt trời, làm giảm tạm thời độ rực rỡ của avatar rim light.',
    },
    {
      id: 'int_sun_rim_avatar',
      source: 'Astronomical Sun Position',
      target: 'Avatar Rim Light (#header)',
      description: 'Quỹ đạo mặt trời 24h đồng bộ góc chiếu sáng viền và nhiệt độ màu trên bức ảnh chân dung.',
    },
    {
      id: 'int_rain_rainbow_cascade',
      source: 'Clearing Rain Shower',
      target: 'Crepuscular Rays & Rainbow',
      description: 'Cơn mưa tạnh khi mặt trời hé rạng tự động kích hoạt cung cầu vồng 42 độ bắc ngang sông.',
    },
    {
      id: 'int_storm_overcast_dim',
      source: 'Thunderstorm Event',
      target: 'Static Screen Theme & Ambient Sky',
      description: 'Mây đen bão dồn dập làm tối sầm không gian màn hình, chỉ sáng bừng khi có tia chớp lóe.',
    },
    {
      id: 'int_drone_formation_mesh',
      source: 'Drone Fleet',
      target: 'Landmark 81 LED Coordination',
      description: 'Dàn drone phối hợp màu sắc đồng bộ với chủ đề ánh sáng trên màn hình LED Landmark 81.',
    },
    {
      id: 'int_aircraft_contrail_spread',
      source: 'High-Altitude Jet',
      target: 'Upper Atmosphere Wind',
      description: 'Vệt khói máy bay phản lực sau khi vẽ đường thẳng bị gió tầng cao xé tơ và tản rộng.',
    },
    {
      id: 'int_aircraft_wash_boids',
      source: 'Helicopter / Landing Aircraft',
      target: 'Flying Birds & Boids',
      description:
        'Luồng xoáy khí động học của máy bay làm các cánh chim lân cận dạt sang hai bên hành lang.',
    },
    {
      id: 'int_moon_halo_cloud_filter',
      source: 'Cirrostratus Ice Clouds',
      target: 'Moon Disc Luminance',
      description: 'Lớp mây băng mỏng tầng cao khúc xạ ánh trăng tạo quầng sáng tròn 22 độ huyền ảo.',
    },
    {
      id: 'int_hover_avoid_boids',
      source: 'User Cursor Hover',
      target: 'Cursor Swarm Flock',
      description:
        'Rê chuột vào nút bấm hay liên kết làm đàn con trỏ tự động tách ra tạo khoảng trống đọc chữ.',
    },
    {
      id: 'int_click_shockwave_boids',
      source: 'User Click Event',
      target: 'Kinetic Ripples & Boids Impulse',
      description:
        'Cú click chuột tạo sóng xung kích hình học đẩy dạt các con trỏ lân cận theo bán kính lực.',
    },
    {
      id: 'int_pointerdown_bubble_boids',
      source: 'Pointer Press / Hold',
      target: 'Repulsion Bubble Zone',
      description:
        'Nhấn giữ chuột duy trì một bong bóng áp lực đàn hồi đẩy đàn con trỏ ra ngoài bán kính 90px.',
    },
    {
      id: 'int_builder_settle_shimmer',
      source: 'Builder Agent Completion',
      target: 'Element Frame Shimmer',
      description:
        'Khi agent dựng xong một phần tử UI, một xung ánh sáng hạt vi mô lấp lánh xuất hiện trên khung viền.',
    },
    {
      id: 'int_midnight_smooth_phase',
      source: 'Diurnal Solar Math',
      target: 'Color Interpolation Engine',
      description:
        'Chuyển giao qua 24:00 liền mạch không giật nhảy màu nhờ phép tịnh tiến gốc chu kỳ về 17:30.',
    },
  ];

  /* ---------- 4. Effect Variations Catalog (250 distinct variations) ---------- */

  const VARIATIONS_CATALOG = [
    // --- 1. FIREWORKS BURST TOPOLOGIES & PHYSICS (35 variations) ---
    { id: 'fw_peony', cat: 'fireworks', name: 'Peony Shell', desc: 'Vòm cầu hạt cháy tròn đều đẳng hướng' },
    {
      id: 'fw_chrysanthemum',
      cat: 'fireworks',
      name: 'Chrysanthemum',
      desc: 'Vòm cầu vệt đuôi sao lấp lánh để lại tàn kim',
    },
    {
      id: 'fw_kamuro',
      cat: 'fireworks',
      name: 'Golden Kamuro Willow',
      desc: 'Liễu rủ vàng kim hạt nặng rơi chậm sát mặt sông',
    },
    {
      id: 'fw_palm',
      cat: 'fireworks',
      name: 'Palm Tree Burst',
      desc: '8 nhánh vạch đậm xòe như tán cây dừa Nam Bộ',
    },
    {
      id: 'fw_crossette',
      cat: 'fireworks',
      name: 'Crossette Split',
      desc: 'Mỗi hạt nổ sơ cấp sau đó vỡ đôi thành góc chữ thập',
    },
    {
      id: 'fw_ring',
      cat: 'fireworks',
      name: 'Saturn Ring Shell',
      desc: 'Vành đai elip nghiêng 3D quay quanh tâm nổ',
    },
    {
      id: 'fw_ring_double',
      cat: 'fireworks',
      name: 'Double Concentric Ring',
      desc: 'Hai vòng tròn đồng tâm đổi màu tương phản',
    },
    {
      id: 'fw_heart',
      cat: 'fireworks',
      name: 'Heart Shape Shell',
      desc: 'Phương trình tham số trái tim bung nở cân xứng',
    },
    {
      id: 'fw_willow_twinkle',
      cat: 'fireworks',
      name: 'Twinkling Willow',
      desc: 'Chùm liễu rủ kết hợp hạt nhấp nháy tần số cao',
    },
    {
      id: 'fw_crackling',
      cat: 'fireworks',
      name: 'Dragon Eggs Crackle',
      desc: 'Hàng trăm hạt nổ lách tách vi mô nở hoa kim tuyến',
    },
    {
      id: 'fw_horse_tail',
      cat: 'fireworks',
      name: 'Horsetail Waterfall',
      desc: 'Chùm pháo đuôi ngựa chúc đầu buông xuống mềm mại',
    },
    {
      id: 'fw_salute',
      cat: 'fireworks',
      name: 'Titanium Flash Salute',
      desc: 'Chớp sáng trắng chói lòa kèm sóng xung kích làm rung boids',
    },
    {
      id: 'fw_whistle_spiral',
      cat: 'fireworks',
      name: 'Whistling Spiral Rocket',
      desc: 'Quỹ đạo xoắn ốc rít gió trước khi phát nổ',
    },
    {
      id: 'fw_water_cake',
      cat: 'fireworks',
      name: 'Aquatic Water Burst',
      desc: 'Pháo bắn góc thấp nổ bung rẻ quạt trên mặt nước sông',
    },
    {
      id: 'fw_aquatic_fan',
      cat: 'fireworks',
      name: 'Aquatic Fan Shells',
      desc: 'Loạt 7 phát nổ góc rẻ quạt quét sát chân trời',
    },
    {
      id: 'fw_comet_arch',
      cat: 'fireworks',
      name: 'Comet Arch Trail',
      desc: 'Vòm sao chổi đuôi rực sáng bay theo đường parabol',
    },
    {
      id: 'fw_ghost_shell',
      cat: 'fireworks',
      name: 'Ghost Color Migration',
      desc: 'Màu sắc biến đổi dần từ trong tâm lan tỏa ra rìa ngoài',
    },
    {
      id: 'fw_pistil',
      cat: 'fireworks',
      name: 'Pistol Center Core',
      desc: 'Nhụy hoa nhỏ màu xanh ngọc nằm lọt trong vòm cầu đỏ vàng',
    },
    {
      id: 'fw_falling_leaves',
      cat: 'fireworks',
      name: 'Falling Leaves Shimmer',
      desc: 'Các mảnh sáng chao đảo rơi lững lờ như lá rụng',
    },
    {
      id: 'fw_strobing_dahlia',
      cat: 'fireworks',
      name: 'Strobing Dahlia',
      desc: 'Hạt sáng to đậm nhấp nháy ngắt nhịp như đèn hiệu',
    },
    {
      id: 'fw_brocade_crown',
      cat: 'fireworks',
      name: 'Brocade Crown Grand',
      desc: 'Vải gấm hoàng gia kim tuyến bung rộng kích thước tối đa',
    },
    {
      id: 'fw_spider',
      cat: 'fireworks',
      name: 'Spider Leg Burst',
      desc: 'Các tia nhện bung xa mảnh khảnh với vận tốc đầu lớn',
    },
    {
      id: 'fw_serpent',
      cat: 'fireworks',
      name: 'Serpent Wiggle',
      desc: 'Tia sáng ngoằn ngoèo uốn lượn tự do như rắn bay',
    },
    {
      id: 'fw_multi_break',
      cat: 'fireworks',
      name: 'Multi-Break Triple Tier',
      desc: 'Ba tầng nổ liên tiếp nhau theo phương thẳng đứng',
    },
    {
      id: 'fw_mine',
      cat: 'fireworks',
      name: 'Ground Mine Eruption',
      desc: 'Cột lửa phụt thẳng từ mặt đất lên như núi lửa mini',
    },
    {
      id: 'fw_tourbillon',
      cat: 'fireworks',
      name: 'Tourbillon Spinner',
      desc: 'Hạt sáng xoay tít hình chong chóng tạo vòng xoáy',
    },
    {
      id: 'fw_waterfall_drop',
      cat: 'fireworks',
      name: 'Niagara Falls Cascade',
      desc: 'Dây pháo thác nước rơi đồng loạt từ mặt cầu Ba Son',
    },
    {
      id: 'fw_glittering_stars',
      cat: 'fireworks',
      name: 'Glittering Pearl Stars',
      desc: 'Hạt lân tinh phát sáng bền bỉ trôi nhẹ trong gió',
    },
    {
      id: 'fw_rainbow_cascade',
      cat: 'fireworks',
      name: 'Rainbow Spectrum Wave',
      desc: 'Loạt nổ tuần tự 7 sắc cầu vồng rực rỡ',
    },
    {
      id: 'fw_smoke_puff',
      cat: 'fireworks',
      name: 'Atmospheric Smoke Puff',
      desc: 'Khói tích tụ phát sáng rồi tản dần theo chiều gió',
    },
    {
      id: 'fw_flash_illumination',
      cat: 'fireworks',
      name: 'Secondary Cloud Flash',
      desc: 'Ánh nổ phản xạ lên đáy mây và mặt nước sông',
    },
    {
      id: 'fw_shockwave_boids',
      cat: 'fireworks',
      name: 'Shockwave Boids Scatter',
      desc: 'Xung kích lực nổ làm bầy con trỏ bay dạt ra ngoài',
    },
    {
      id: 'fw_dragon_eggs',
      cat: 'fireworks',
      name: 'Dragon Eggs Burst',
      desc: 'Đám mây hạt nổ đa điểm phát tiếng lách tách nở rộ',
    },
    {
      id: 'fw_hummer',
      cat: 'fireworks',
      name: 'Spinning Hummer',
      desc: 'Hạt sáng bay liệng đảo chiều với quỹ đạo hỗn loạn',
    },
    {
      id: 'fw_zenith_finale',
      cat: 'fireworks',
      name: 'Zenith Grand Finale',
      desc: 'Đợt nổ đỉnh cao kết hợp 10 vòm đa tầng chiếm trọn bầu trời',
    },

    // --- 2. CLOUD DYNAMICS & FORMATIONS (25 variations) ---
    {
      id: 'cld_cumulus_fair',
      cat: 'clouds',
      name: 'Fair Weather Cumulus',
      desc: 'Mây tích xốp mềm trôi thong thả ngày nắng ráo',
    },
    {
      id: 'cld_cumulonimbus',
      cat: 'clouds',
      name: 'Anvil Cumulonimbus',
      desc: 'Khối mây vũ tích hình đe cao ngất báo hiệu dông bão',
    },
    {
      id: 'cld_cirrus_wisps',
      cat: 'clouds',
      name: 'Cirrus Feather Wisps',
      desc: 'Mây ti dạng dải sợi tơ mảnh lướt nhanh ở tầng cao',
    },
    {
      id: 'cld_stratus_blanket',
      cat: 'clouds',
      name: 'Low Stratus Blanket',
      desc: 'Lớp mây xám sà thấp che phủ chân trời thành phố',
    },
    {
      id: 'cld_altocumulus',
      cat: 'clouds',
      name: 'Altocumulus Mackerel',
      desc: 'Mây vảy cá gợn sóng đều đặn phản chiếu ánh chiều',
    },
    {
      id: 'cld_mammatus',
      cat: 'clouds',
      name: 'Mammatus Pouches',
      desc: 'Mây dạng túi vú kỳ vĩ treo dưới chân đám mây dông',
    },
    {
      id: 'cld_lenticular',
      cat: 'clouds',
      name: 'Lenticular Disc Cloud',
      desc: 'Mây dạng thấu kính đứng yên bất chấp gió mạnh',
    },
    {
      id: 'cld_wind_shear',
      cat: 'clouds',
      name: 'Wind Shear Shredding',
      desc: 'Mép mây bị gió tầng cao xé tơi thành những dải mảnh',
    },
    {
      id: 'cld_sunset_crepuscular',
      cat: 'clouds',
      name: 'Crepuscular Ray Caster',
      desc: 'Mây chắn nắng tạo luồng nan quạt sáng rọi xuống sông',
    },
    {
      id: 'cld_silver_lining',
      cat: 'clouds',
      name: 'Silver Moon Lining',
      desc: 'Viền sáng bạc bao quanh đám mây khi trăng đi qua',
    },
    {
      id: 'cld_golden_rim',
      cat: 'clouds',
      name: 'Golden Hour Cloud Rim',
      desc: 'Rìa mây rực rỡ sắc vàng cam hoàng hôn rực sáng',
    },
    {
      id: 'cld_twilight_purple',
      cat: 'clouds',
      name: 'Twilight Purple Tint',
      desc: 'Mây nhuộm sắc tím thẫm lúc chập tối chạng vạng',
    },
    {
      id: 'cld_dawn_rose',
      cat: 'clouds',
      name: 'Dawn Rose Blush',
      desc: 'Mây ửng sắc hồng đào đón ánh bình minh rạng đông',
    },
    {
      id: 'cld_storm_underbelly',
      cat: 'clouds',
      name: 'Dark Storm Underbelly',
      desc: 'Đáy mây đen kịt vần vũ đe dọa mang theo hơi nước',
    },
    {
      id: 'cld_dissipating',
      cat: 'clouds',
      name: 'Dissipating Cloud Edge',
      desc: 'Mây mỏng dần rồi bốc hơi hoàn toàn vào không khí',
    },
    {
      id: 'cld_condensing',
      cat: 'clouds',
      name: 'Condensing Cloud Swell',
      desc: 'Hơi ẩm ngưng tụ làm khối mây phình to dần',
    },
    {
      id: 'cld_scud_fast',
      cat: 'clouds',
      name: 'Fast Scud Cloud Drifter',
      desc: 'Mảng mây rách bay vút nhanh dưới tầng mây chính',
    },
    {
      id: 'cld_moon_transit',
      cat: 'clouds',
      name: 'Moon Transit Diffusion',
      desc: 'Mây mỏng lướt qua làm đĩa trăng mờ ảo huyền bí',
    },
    {
      id: 'cld_sun_obscure',
      cat: 'clouds',
      name: 'Sun Dimming Cloud',
      desc: 'Mây che khuất mặt trời làm dịu bớt ánh sáng chói',
    },
    {
      id: 'cld_rain_shaft',
      cat: 'clouds',
      name: 'Visible Rain Shaft',
      desc: 'Cột mưa xám xịt buông từ đáy mây xuống mặt đất',
    },
    {
      id: 'cld_mirrored_water',
      cat: 'clouds',
      name: 'River Cloud Reflection',
      desc: 'Bóng mây chuyển động in trên mặt nước sông Sài Gòn',
    },
    {
      id: 'cld_fog_strata',
      cat: 'clouds',
      name: 'Ground Fog Strata',
      desc: 'Tầng sương mây là đà là mặt sông lúc sáng sớm',
    },
    {
      id: 'cld_thunderhead_glow',
      cat: 'clouds',
      name: 'Thunderhead Internal Glow',
      desc: 'Khối mây sáng rực từ bên trong khi có chớp nội bộ',
    },
    {
      id: 'cld_overcast_drift',
      cat: 'clouds',
      name: 'Uniform Overcast Drift',
      desc: 'Bầu trời phủ kín mây xám trôi đều trầm mặc',
    },
    {
      id: 'cld_turbulent_churn',
      cat: 'clouds',
      name: 'Shelf Cloud Roll',
      desc: 'Mây thềm cuộn xoáy mép trước của cơn dông lớn',
    },

    // --- 3. BIRD & FLOCKING FLIGHT BEHAVIORS (30 variations) ---
    {
      id: 'flk_v_formation',
      cat: 'flocking',
      name: 'V-Migratory Formation',
      desc: 'Đội hình chữ V chuẩn khí động học của đàn chim',
    },
    {
      id: 'flk_echelon',
      cat: 'flocking',
      name: 'Echelon Diagonal Line',
      desc: 'Đội hình đường chéo một bên đón luồng gió nghiêng',
    },
    {
      id: 'flk_murmuration_wave',
      cat: 'flocking',
      name: 'Density Wave Murmuration',
      desc: 'Sóng nén mật độ uốn lượn như dải lụa trên bầu trời',
    },
    {
      id: 'flk_circular_thermal',
      cat: 'flocking',
      name: 'Thermal Spiral Soaring',
      desc: 'Bay lượn vòng tròn đón cột khí nóng bốc lên',
    },
    {
      id: 'flk_diving_strike',
      cat: 'flocking',
      name: 'River Dive Strike',
      desc: 'Lao dốc thẳng đứng xuống mặt nước sông bắt mồi',
    },
    {
      id: 'flk_low_water_skimming',
      cat: 'flocking',
      name: 'Low Water Skimming',
      desc: 'Lướt sát sạt mặt sông theo các con sóng nhỏ',
    },
    {
      id: 'flk_scatter_panic',
      cat: 'flocking',
      name: 'Sudden Panic Scatter',
      desc: 'Tản mác hỗn loạn khi có tiếng nổ hoặc chớp giật',
    },
    {
      id: 'flk_regroup_reform',
      cat: 'flocking',
      name: 'Post-Panic Regrouping',
      desc: 'Tụ họp lại đội hình sau khi mối nguy hiểm qua đi',
    },
    {
      id: 'flk_perching_glide',
      cat: 'flocking',
      name: 'Perch Glide Descent',
      desc: 'Liệng cánh không vỗ chuẩn bị hạ xuống vòm cây xanh',
    },
    {
      id: 'flk_sparrow_flit',
      cat: 'flocking',
      name: 'Sparrow Flitting Jitter',
      desc: 'Nhảy nhót bay từng đoạn ngắn giật nhịp dứt khoát',
    },
    {
      id: 'flk_swallow_swoop',
      cat: 'flocking',
      name: 'Swallow Acrobatic Swoop',
      desc: 'Én chao liệng gấp khúc chữ Z bắt côn trùng chiều muộn',
    },
    {
      id: 'flk_bat_erratic',
      cat: 'flocking',
      name: 'Bat Erratic Flutter',
      desc: 'Dơi bay đập cánh nhanh và đổi hướng liên tục',
    },
    {
      id: 'flk_pigeon_wheel',
      cat: 'flocking',
      name: 'Pigeon Synchronized Wheel',
      desc: 'Đàn bồ câu đảo vòng đồng loạt nghiêng cánh lấp lánh',
    },
    {
      id: 'flk_eagle_soar',
      cat: 'flocking',
      name: 'Solitary Eagle Soar',
      desc: 'Đại bàng đơn độc dang rộng cánh xoay tròn đỉnh tháp',
    },
    {
      id: 'flk_wind_hover',
      cat: 'flocking',
      name: 'Headwind Stationary Hover',
      desc: 'Đứng yên giữa trời đối kháng ngược chiều gió mạnh',
    },
    {
      id: 'flk_downwind_dash',
      cat: 'flocking',
      name: 'Tailwind Speed Dash',
      desc: 'Tận dụng gió xuôi lao vút với vận tốc tăng vọt',
    },
    {
      id: 'flk_dusk_roosting',
      cat: 'flocking',
      name: 'Dusk Roosting Flight',
      desc: 'Bay về tổ từng tốp nhỏ nhịp nhàng lúc chạng vạng',
    },
    {
      id: 'flk_dawn_departure',
      cat: 'flocking',
      name: 'Dawn Foraging Departure',
      desc: 'Tỏa ra các hướng kiếm ăn khi trời vừa rạng đông',
    },
    {
      id: 'flk_follow_leader',
      cat: 'flocking',
      name: 'Follow-the-Leader Snake',
      desc: 'Di chuyển uốn lượn nối đuôi nhau theo một con đầu đàn',
    },
    {
      id: 'flk_flock_split',
      cat: 'flocking',
      name: 'Obstacle Bifurcation',
      desc: 'Đàn tách đôi mượt mà vượt qua chướng ngại Landmark 81',
    },
    {
      id: 'flk_flock_merge',
      cat: 'flocking',
      name: 'Two-Flock Confluence',
      desc: 'Hai tốp chim nhỏ hợp nhất thành một đàn lớn',
    },
    {
      id: 'flk_boids_cohesion',
      cat: 'flocking',
      name: 'Boids Cohesion Pull',
      desc: 'Lực hút kéo các cá thể về phía trung tâm khối',
    },
    {
      id: 'flk_boids_separation',
      cat: 'flocking',
      name: 'Boids Separation Repulse',
      desc: 'Lực đẩy khoảng cách an toàn tránh va chạm cự ly gần',
    },
    {
      id: 'flk_boids_alignment',
      cat: 'flocking',
      name: 'Boids Alignment Sync',
      desc: 'Lực đồng nhất vận tốc và phương hướng di chuyển',
    },
    {
      id: 'flk_cursor_avoid',
      cat: 'flocking',
      name: 'Cursor Proximity Avoidance',
      desc: 'Tránh xa con trỏ chuột người dùng khi rê đến gần',
    },
    {
      id: 'flk_cursor_swarm',
      cat: 'flocking',
      name: 'Idle Cursor Swirl',
      desc: 'Xoáy tròn quanh vị trí chuột khi chuột đứng yên',
    },
    {
      id: 'flk_shadow_ground',
      cat: 'flocking',
      name: 'Flock Ground Shadow',
      desc: 'Bóng đàn chim lướt qua các tòa nhà đường phố',
    },
    {
      id: 'flk_silhouette_sunset',
      cat: 'flocking',
      name: 'Sunset Silhouette Flight',
      desc: 'Bóng đen chim in sắc nét trên nền trời rực đỏ',
    },
    {
      id: 'flk_wing_flapping_sync',
      cat: 'flocking',
      name: 'Periodic Wingbeat Wave',
      desc: 'Nhịp đập cánh lan tỏa tuần hoàn khắp đàn chim',
    },
    {
      id: 'flk_gust_turbulence',
      cat: 'flocking',
      name: 'Gust Turbulence Recovery',
      desc: 'Nghiêng ngả chao đảo khi gặp đợt gió giật bất ngờ',
    },

    // --- 4. LIGHTNING & ELECTRICAL DISCHARGES (20 variations) ---
    {
      id: 'ltg_cloud_to_ground',
      cat: 'lightning',
      name: 'Cloud-to-Ground Strike',
      desc: 'Tia sét chính đánh thẳng từ mây xuống mặt đất',
    },
    {
      id: 'ltg_branched_fork',
      cat: 'lightning',
      name: 'Forked Branched Tree',
      desc: 'Chớp phân nhánh rễ cây 4–5 nhánh phụ lan rộng',
    },
    {
      id: 'ltg_sheet_diffuse',
      cat: 'lightning',
      name: 'Intra-Cloud Sheet Flash',
      desc: 'Chớp sáng khuếch tán bên trong đám mây',
    },
    {
      id: 'ltg_spider_crawlers',
      cat: 'lightning',
      name: 'Spider Anvil Crawlers',
      desc: 'Tia chớp bò ngang đáy mây kéo dài hàng cây số',
    },
    {
      id: 'ltg_anvil_crawler',
      cat: 'lightning',
      name: 'Anvil Top Discharge',
      desc: 'Chớp bò trên đỉnh mây đe vút lên tầng khí quyển cao',
    },
    {
      id: 'ltg_double_strike',
      cat: 'lightning',
      name: 'Simultaneous Twin Strike',
      desc: 'Hai tia sét đánh đồng thời cách nhau vài chục px',
    },
    {
      id: 'ltg_strobe_multi',
      cat: 'lightning',
      name: 'Multi-Stroke Restrike',
      desc: 'Chớp nhấp nháy 3–4 lần trên cùng một rãnh ion hóa',
    },
    {
      id: 'ltg_heat_distant',
      cat: 'lightning',
      name: 'Silent Heat Lightning',
      desc: 'Chớp nhiệt không tiếng sấm ở chân trời xa xôi',
    },
    {
      id: 'ltg_ribbon',
      cat: 'lightning',
      name: 'Ribbon Wind-Blown Strike',
      desc: 'Gió mạnh thổi dạt rãnh ion tạo vệt chớp ruy băng',
    },
    {
      id: 'ltg_bead',
      cat: 'lightning',
      name: 'Bead Lightning Chain',
      desc: 'Chớp đứt đoạn thành chuỗi hạt sáng lấp lánh',
    },
    {
      id: 'ltg_skyline_silhouette',
      cat: 'lightning',
      name: 'Skyline Silhouette Flash',
      desc: 'Tia chớp làm nổi bật viền đen Landmark 81',
    },
    {
      id: 'ltg_water_reflection',
      cat: 'lightning',
      name: 'River Vertical Reflection',
      desc: 'Vệt sáng chớp in bóng thẳng đứng xuống mặt sông',
    },
    {
      id: 'ltg_cloud_illumination',
      cat: 'lightning',
      name: 'Cloud Volume Illumination',
      desc: 'Chiếu sáng thể tích 3D của các khối mây lân cận',
    },
    {
      id: 'ltg_color_violet',
      cat: 'lightning',
      name: 'Humid Violet Lightning',
      desc: 'Ánh chớp sắc tím đặc trưng trong không khí ẩm nhiệt đới',
    },
    {
      id: 'ltg_color_blue_white',
      cat: 'lightning',
      name: 'High-Energy Blue-White',
      desc: 'Ánh chớp trắng xanh nhiệt độ cao chói lòa',
    },
    {
      id: 'ltg_color_reddish',
      cat: 'lightning',
      name: 'Haze Reddish Strike',
      desc: 'Ánh chớp ửng đỏ qua lớp bụi mù mịt xa',
    },
    {
      id: 'ltg_cascade_trigger',
      cat: 'lightning',
      name: 'Thunder Startle Trigger',
      desc: 'Tia chớp kích hoạt phản xạ giật mình của bầy chim',
    },
    {
      id: 'ltg_flicker_decay',
      cat: 'lightning',
      name: 'Phosphor Decay Glow',
      desc: 'Rãnh ion tắt dần có độ trễ lân tinh phốt pho',
    },
    {
      id: 'ltg_ambient_flash',
      cat: 'lightning',
      name: 'Ambient Header Flash',
      desc: 'Chớp làm tăng độ sáng màn hình portfolio tạm thời',
    },
    {
      id: 'ltg_thunder_delay',
      cat: 'lightning',
      name: 'Sound Speed Delay Effect',
      desc: 'Mô phỏng độ trễ ánh sáng đi trước sấm vang theo sau',
    },

    // --- 5. PRECIPITATION & HYDROMETEORS (20 variations) ---
    {
      id: 'rain_drizzle_mist',
      cat: 'precipitation',
      name: 'Drizzle Mist Haze',
      desc: 'Mưa bụi li ti bay lơ lửng trong không khí',
    },
    {
      id: 'rain_steady_shower',
      cat: 'precipitation',
      name: 'Steady Summer Shower',
      desc: 'Mưa rào đều hạt góc nghiêng theo chiều gió',
    },
    {
      id: 'rain_tropical_downpour',
      cat: 'precipitation',
      name: 'Tropical Torrential Rain',
      desc: 'Mưa xối xả mật độ cao làm mờ đường chân trời',
    },
    {
      id: 'rain_wind_swept',
      cat: 'precipitation',
      name: 'Wind-Swept Diagonal',
      desc: 'Mưa bị gió tạt xiên 45 độ dữ dội',
    },
    {
      id: 'rain_sun_lit',
      cat: 'precipitation',
      name: 'Sunlit Golden Droplets',
      desc: 'Mưa bóng mây hạt sáng vàng lấp lánh dưới nắng',
    },
    {
      id: 'rain_distant_shaft',
      cat: 'precipitation',
      name: 'Distant Rain Curtain',
      desc: 'Màn mưa xám xa tít buông xuống một góc thành phố',
    },
    {
      id: 'rain_virga_wisps',
      cat: 'precipitation',
      name: 'Virga Evaporating Wisps',
      desc: 'Vệt mưa bốc hơi tản tơ trước khi chạm tới đất',
    },
    {
      id: 'rain_fog_ground',
      cat: 'precipitation',
      name: 'Post-Rain Ground Vapor',
      desc: 'Hơi nước bốc lên từ mặt đường ấm sau cơn mưa',
    },
    {
      id: 'rain_droplet_streak',
      cat: 'precipitation',
      name: 'Motion Blurred Droplets',
      desc: 'Hạt mưa kéo dài thành vệt sợi mờ vận tốc cao',
    },
    {
      id: 'rain_lens_splash',
      cat: 'precipitation',
      name: 'Screen Droplet Splash',
      desc: 'Hạt mưa chạm ống kính tản tròn lan rộng',
    },
    {
      id: 'rain_puddle_ripples',
      cat: 'precipitation',
      name: 'River Surface Ripples',
      desc: 'Hàng ngàn gợn sóng tròn đồng tâm trên mặt sông',
    },
    {
      id: 'rain_haze_desaturation',
      cat: 'precipitation',
      name: 'Atmospheric Desaturation',
      desc: 'Mưa làm giảm độ bão hòa màu của cảnh vật phía sau',
    },
    {
      id: 'rain_rainbow_formation',
      cat: 'precipitation',
      name: 'Primary 42deg Rainbow',
      desc: 'Cung cầu vồng chính hình thành đối diện mặt trời',
    },
    {
      id: 'rain_secondary_bow',
      cat: 'precipitation',
      name: 'Secondary Inverted Rainbow',
      desc: 'Cung cầu vồng phụ đảo ngược thứ tự phổ màu',
    },
    {
      id: 'rain_clearing_drips',
      cat: 'precipitation',
      name: 'Clearing Scattered Drips',
      desc: 'Những giọt nước thưa thớt khi cơn mưa dần tạnh',
    },
    {
      id: 'rain_roof_runoff',
      cat: 'precipitation',
      name: 'Canopy Edge Runoff',
      desc: 'Dòng nước mưa đổ thành dải từ mép mái hiên',
    },
    {
      id: 'rain_thunderstorm_mix',
      cat: 'precipitation',
      name: 'Convective Storm Mix',
      desc: 'Mưa nặng hạt kết hợp chớp rạch và gió giật',
    },
    {
      id: 'rain_ambient_dim',
      cat: 'precipitation',
      name: 'Sky Ambient Darkening',
      desc: 'Bầu trời sẫm màu khi mây mưa bao phủ dày đặc',
    },
    {
      id: 'rain_mist_layer',
      cat: 'precipitation',
      name: 'River Mist Stratum',
      desc: 'Lớp sương mưa dâng cao trên mặt sông Sài Gòn',
    },
    {
      id: 'rain_micro_particles',
      cat: 'precipitation',
      name: 'Turbulent Spray Particles',
      desc: 'Bụi nước mịn bay cuộn xoáy theo luồng gió xoáy',
    },

    // --- 6. AERONAUTICAL & FLIGHT MOTIONS (25 variations) ---
    {
      id: 'air_landing_approach',
      cat: 'aviation',
      name: 'Tan Son Nhat 3deg Glide',
      desc: 'Máy bay hạ cánh góc 3 độ giảm dần độ cao vào sân bay',
    },
    {
      id: 'air_takeoff_climb',
      cat: 'aviation',
      name: 'Steep Takeoff Climb',
      desc: 'Máy bay cất cánh dốc ngược tăng tốc lên tầng mây',
    },
    {
      id: 'air_level_cruise',
      cat: 'aviation',
      name: 'High Altitude Cruise',
      desc: 'Bay hành trình ổn định cắt ngang đường chân trời',
    },
    {
      id: 'air_banking_turn',
      cat: 'aviation',
      name: 'Coordinated Bank Turn',
      desc: 'Nghiêng cánh 25 độ đổi hướng bay trên bầu trời',
    },
    {
      id: 'air_contrail_dense',
      cat: 'aviation',
      name: 'Dense Ice Contrail',
      desc: 'Vệt khói ngưng tụ tinh thể băng dày đặc trắng xóa',
    },
    {
      id: 'air_contrail_evaporate',
      cat: 'aviation',
      name: 'Short Dissipating Trail',
      desc: 'Vệt khói ngắn vừa phun ra vừa bốc hơi tan dần',
    },
    {
      id: 'air_contrail_sunset',
      cat: 'aviation',
      name: 'Sunset Gilded Contrail',
      desc: 'Vệt khói phản chiếu ánh hoàng hôn đỏ cam rực rỡ',
    },
    {
      id: 'air_night_strobe',
      cat: 'aviation',
      name: 'Anti-Collision Strobes',
      desc: 'Đèn nhấp nháy chớp trắng/đỏ/xanh định vị ban đêm',
    },
    {
      id: 'air_landing_lights',
      cat: 'aviation',
      name: 'Dual Landing Beams',
      desc: 'Chùm đèn pha hạ cánh chiếu sáng không gian phía trước',
    },
    {
      id: 'air_helicopter_hover',
      cat: 'aviation',
      name: 'Helicopter Static Hover',
      desc: 'Trực thăng đứng yên lắc lư nhẹ theo luồng khí xả',
    },
    {
      id: 'air_helicopter_forward',
      cat: 'aviation',
      name: 'Helicopter Nose-Down Push',
      desc: 'Trực thăng chúc mũi bay tới với vận tốc tăng dần',
    },
    {
      id: 'air_helicopter_rotor_blur',
      cat: 'aviation',
      name: 'Rotor Disc Motion Blur',
      desc: 'Cánh quạt quay nhanh tạo đĩa mờ bán trong suốt',
    },
    {
      id: 'air_banner_wave',
      cat: 'aviation',
      name: 'Sinusoidal Banner Flutter',
      desc: 'Dải băng rôn chữ uốn lượn hình sin mềm mại',
    },
    {
      id: 'air_banner_flutter',
      cat: 'aviation',
      name: 'Tail Edge Flutter',
      desc: 'Mép đuôi băng rôn rung nhanh theo luồng gió xoáy',
    },
    {
      id: 'air_paperplane_glide',
      cat: 'aviation',
      name: 'Paperplane Buoyant Glide',
      desc: 'Máy bay giấy lướt dập dềnh theo lực nâng khí động',
    },
    {
      id: 'air_paperplane_stall',
      cat: 'aviation',
      name: 'Paperplane Stall & Dive',
      desc: 'Máy bay giấy ngóc đầu mất lực rồi chúi mũi xuống',
    },
    {
      id: 'air_paperplane_loop',
      cat: 'aviation',
      name: 'Paperplane Loop-the-Loop',
      desc: 'Máy bay giấy nhào lộn một vòng cung tròn trên không',
    },
    {
      id: 'air_paperplane_flutter',
      cat: 'aviation',
      name: 'Paperplane Wing Oscillation',
      desc: 'Máy bay giấy chao đảo sang hai bên lắc lư cánh',
    },
    {
      id: 'air_altitude_high',
      cat: 'aviation',
      name: 'Stratospheric Silhouette',
      desc: 'Máy bay nhỏ xíu in bóng trên tầng mây ti trên cao',
    },
    {
      id: 'air_altitude_low',
      cat: 'aviation',
      name: 'Low Urban Flyover',
      desc: 'Máy bay to rõ bay sát qua nóc các tòa nhà cao tầng',
    },
    {
      id: 'air_speed_fast',
      cat: 'aviation',
      name: 'Supersonic Fast Dash',
      desc: 'Phản lực lướt qua màn hình chỉ trong vài giây',
    },
    {
      id: 'air_speed_slow',
      cat: 'aviation',
      name: 'Cessna Slow Cruiser',
      desc: 'Máy bay cánh quạt bay tà tà thong thả ngắm cảnh',
    },
    {
      id: 'air_wake_turbulence',
      cat: 'aviation',
      name: 'Wake Vortex Cloud Swirl',
      desc: 'Luồng xoáy đuôi máy bay làm xao động đám mây phía sau',
    },
    {
      id: 'air_searchlight_sweep',
      cat: 'aviation',
      name: 'Police Chopper Spotlight',
      desc: 'Đèn tìm kiếm trực thăng quét chùm sáng hình nón xuống sông',
    },
    {
      id: 'air_formation_flight',
      cat: 'aviation',
      name: 'Three-Aircraft Formation',
      desc: 'Đội hình biểu diễn 3 máy bay giữ cự ly chuẩn xác',
    },

    // --- 7. BOTANICAL & DRIFTING PARTICLES (25 variations) ---
    {
      id: 'bot_mai_single_tumble',
      cat: 'botanical',
      name: 'Mai Petal 3D Tumble',
      desc: 'Cánh hoa mai đơn lẻ lộn nhào xoay 3 chiều trong gió',
    },
    {
      id: 'bot_mai_cluster_fall',
      cat: 'botanical',
      name: 'Mai Blossom Shower',
      desc: 'Chùm cánh hoa mai vàng rơi tản mát chào đón xuân',
    },
    {
      id: 'bot_mai_spiral_draft',
      cat: 'botanical',
      name: 'Updraft Petal Vortex',
      desc: 'Cánh hoa mai bị luồng gió xoáy nâng bay lên cao',
    },
    {
      id: 'bot_mai_ground_skitter',
      cat: 'botanical',
      name: 'Ground Skitter Drift',
      desc: 'Cánh hoa lướt là đà theo mặt đất trước khi dừng',
    },
    {
      id: 'bot_seed_helicopter',
      cat: 'botanical',
      name: 'Dipterocarp Seed Spin',
      desc: 'Quả hoa dầu Sài Gòn xoay tít 2 cánh như cánh quạt',
    },
    {
      id: 'bot_seed_spiral_descent',
      cat: 'botanical',
      name: 'Seed Spiral Descent',
      desc: 'Hoa dầu rơi theo quỹ đạo hình trụ xoắn ốc chậm',
    },
    {
      id: 'bot_seed_gust_lift',
      cat: 'botanical',
      name: 'Wind Gust Seed Lift',
      desc: 'Cơn gió thổi thốc quả hoa dầu bay bổng ngược lên',
    },
    {
      id: 'bot_bougainvillea_drift',
      cat: 'botanical',
      name: 'Bougainvillea Pink Petal',
      desc: 'Cánh hoa giấy hồng phấn mỏng manh bay là đà',
    },
    {
      id: 'bot_leaf_tumbling',
      cat: 'botanical',
      name: 'Autumn Leaf Pendulum',
      desc: 'Chiếc lá vàng chao đảo lắc lư như con lắc rơi',
    },
    {
      id: 'bot_leaf_flutter',
      cat: 'botanical',
      name: 'Fast Edge Flutter',
      desc: 'Lá cây xoay quanh trục dọc rơi nhanh xuống đất',
    },
    {
      id: 'bot_bubble_wobble',
      cat: 'botanical',
      name: 'Soap Bubble Elastic Wobble',
      desc: 'Bong bóng xà phòng dao động méo mó hình cầu co giãn',
    },
    {
      id: 'bot_bubble_iridescence',
      cat: 'botanical',
      name: 'Spectral Color Shimmer',
      desc: 'Màng bong bóng đổi sắc cầu vồng theo góc ánh sáng',
    },
    {
      id: 'bot_bubble_pop',
      cat: 'botanical',
      name: 'Surface Tension Pop',
      desc: 'Bong bóng vỡ tan thành những giọt sương vi mô',
    },
    {
      id: 'bot_balloon_buoyant',
      cat: 'botanical',
      name: 'Archimedes Buoyancy Rise',
      desc: 'Quả bóng bay bốc lên theo lực đẩy Ac-si-met',
    },
    {
      id: 'bot_balloon_cluster_sway',
      cat: 'botanical',
      name: 'Tethered Cluster Sway',
      desc: 'Chùm bóng bay nghiêng ngả lắc lư dây buộc',
    },
    {
      id: 'bot_kite_taut_line',
      cat: 'botanical',
      name: 'Catenary Kite Line',
      desc: 'Dây diều võng cong căng theo sức gió trên cao',
    },
    {
      id: 'bot_kite_bobbing',
      cat: 'botanical',
      name: 'Kite Altitude Bobbing',
      desc: 'Cánh diều nhấp nhô độ cao theo nhịp thở của gió',
    },
    {
      id: 'bot_kite_tail_wave',
      cat: 'botanical',
      name: 'Serpentine Tail Wave',
      desc: 'Dải đuôi diều dài uốn lượn nhiều khúc nhịp nhàng',
    },
    {
      id: 'bot_lantern_candle_flicker',
      cat: 'botanical',
      name: 'Flickering Flame Core',
      desc: 'Ngọn nến bên trong đèn hoa đăng bập bùng sáng tối',
    },
    {
      id: 'bot_lantern_sky_rise',
      cat: 'botanical',
      name: 'Lantern Sky Horizon Rise',
      desc: 'Đèn trời bay cao dần và thu nhỏ thành đốm sao',
    },
    {
      id: 'bot_dust_solar_motes',
      cat: 'botanical',
      name: 'Sunlit Dust Motes',
      desc: 'Hạt bụi vàng kim chuyển động Brown lơ lửng trong nắng',
    },
    {
      id: 'bot_firefly_glow_pulse',
      cat: 'botanical',
      name: 'Bioluminescent Pulse',
      desc: 'Đom đóm bờ sông phát sáng nhấp nháy chu kỳ 1.2s',
    },
    {
      id: 'bot_firefly_wander',
      cat: 'botanical',
      name: 'Firefly Random Walk',
      desc: 'Đom đóm bay zíc zắc ngẫu nhiên tìm bạn tình',
    },
    {
      id: 'bot_rain_splash_spray',
      cat: 'botanical',
      name: 'Ground Impact Spray',
      desc: 'Hạt nước bắn tung tóe thành chùm tia khi va chạm',
    },
    {
      id: 'bot_mist_waft',
      cat: 'botanical',
      name: 'Morning Mist Waft',
      desc: 'Làn sương mỏng cuộn tròn bay qua tầm mắt',
    },

    // --- 8. ASTRONOMICAL & CELESTIAL PHENOMENA (25 variations) ---
    {
      id: 'ast_meteor_fast_streak',
      cat: 'astronomy',
      name: 'Hypervelocity Meteor',
      desc: 'Vệt sao băng lao vút cực nhanh trong 0.25 giây',
    },
    {
      id: 'ast_meteor_persistent_train',
      cat: 'astronomy',
      name: 'Persistent Ion Train',
      desc: 'Sao băng để lại vệt bụi lân tinh mờ sáng 3–4 giây',
    },
    {
      id: 'ast_bolide_explosion',
      cat: 'astronomy',
      name: 'Bolide Terminal Airburst',
      desc: 'Thiên thạch cầu lửa phát nổ chói lòa chia nhiều mảnh',
    },
    {
      id: 'ast_satellite_steady_dot',
      cat: 'astronomy',
      name: 'LEO Satellite Dot',
      desc: 'Vệ tinh nhân tạo là điểm sáng trôi thẳng đều tĩnh lặng',
    },
    {
      id: 'ast_satellite_flare_iridium',
      cat: 'astronomy',
      name: 'Solar Panel Flare Flash',
      desc: 'Tấm pin mặt trời vệ tinh bắt nắng lóe sáng cực đại',
    },
    {
      id: 'ast_starlink_chain',
      cat: 'astronomy',
      name: 'Starlink Constellation Line',
      desc: 'Chuỗi 12 vệ tinh nối đuôi nhau cách đều trên quỹ đạo',
    },
    {
      id: 'ast_comet_dust_tail',
      cat: 'astronomy',
      name: 'Curved Comet Dust Tail',
      desc: 'Đuôi bụi sao chổi cong cong phản chiếu ánh sáng mặt trời',
    },
    {
      id: 'ast_comet_ion_tail',
      cat: 'astronomy',
      name: 'Straight Blue Ion Tail',
      desc: 'Đuôi khí ion sao chổi thẳng tắp màu xanh lam hướng xa nắng',
    },
    {
      id: 'ast_eclipse_totality',
      cat: 'astronomy',
      name: 'Blood Moon Totality',
      desc: 'Mặt trăng máu đỏ đồng khúc xạ qua khí quyển Trái Đất',
    },
    {
      id: 'ast_eclipse_diamond_ring',
      cat: 'astronomy',
      name: 'Diamond Ring Effect',
      desc: 'Điểm sáng lóe kim cương ở khoảnh khắc nhật thực thoát',
    },
    {
      id: 'ast_moon_halo_circular',
      cat: 'astronomy',
      name: '22deg Lunar Halo Ring',
      desc: 'Quầng sáng tròn 22 độ khúc xạ qua tinh thể băng',
    },
    {
      id: 'ast_sundog_flanks',
      cat: 'astronomy',
      name: 'Parhelia Solar Flanks',
      desc: 'Hai điểm sáng giả rực rỡ nằm ở hai bên mặt trời',
    },
    {
      id: 'ast_crepuscular_rays',
      cat: 'astronomy',
      name: 'Crepuscular Light Fan',
      desc: 'Tia nắng rọi nan quạt xuyên qua khe mây xuống sông',
    },
    {
      id: 'ast_anticrepuscular_rays',
      cat: 'astronomy',
      name: 'Anticrepuscular Convergence',
      desc: 'Tia nắng hội tụ về điểm đối nhật ở chân trời đối diện',
    },
    {
      id: 'ast_belt_of_venus_band',
      cat: 'astronomy',
      name: 'Belt of Venus Arch',
      desc: 'Dải màu hồng đào nằm trên bóng tối xanh xám của Trái Đất',
    },
    {
      id: 'ast_green_flash_horizon',
      cat: 'astronomy',
      name: 'Green Flash Mirage',
      desc: 'Tia chớp xanh lục hiếm gặp ở vành trên mặt trời lặn',
    },
    {
      id: 'ast_supermoon_horizon_illusion',
      cat: 'astronomy',
      name: 'Supermoon Horizon Illusion',
      desc: 'Siêu trăng to khổng lồ khi vừa mọc trên đường chân trời',
    },
    {
      id: 'ast_milkyway_dust_lane',
      cat: 'astronomy',
      name: 'Great Rift Dust Lane',
      desc: 'Vệt bụi tối phân đôi dải Ngân Hà lấp lánh sao',
    },
    {
      id: 'ast_aurora_curtain',
      cat: 'astronomy',
      name: 'Geomagnetic Aurora Curtain',
      desc: 'Rèm cực quang gợn sóng lượn xanh lục tím',
    },
    {
      id: 'ast_aurora_pulsating',
      cat: 'astronomy',
      name: 'Pulsating Aurora Patch',
      desc: 'Đốm sáng cực quang nhấp nháy chu kỳ thở chậm',
    },
    {
      id: 'ast_constellation_orion',
      cat: 'astronomy',
      name: 'Orion Constellation Stars',
      desc: 'Chòm sao thợ săn Orion hiện rõ 3 ngôi sao thắt lưng',
    },
    {
      id: 'ast_venus_evening_star',
      cat: 'astronomy',
      name: 'Venus Evening Star Beacon',
      desc: 'Sao Kim sáng vằng vặc như ngọn hải đăng phương Tây',
    },
    {
      id: 'ast_twinkling_stars',
      cat: 'astronomy',
      name: 'Atmospheric Scintillation',
      desc: 'Sao nhấp nháy đổi màu li ti do nhiễu động khí quyển',
    },
    {
      id: 'ast_planet_steady_glow',
      cat: 'astronomy',
      name: 'Steady Planetary Disc',
      desc: 'Hành tinh sao Mộc sáng tĩnh không nhấp nháy',
    },
    {
      id: 'ast_zodiacal_pyramid',
      cat: 'astronomy',
      name: 'Zodiacal Light Pyramid',
      desc: 'Hình tháp bụi nhật tâm mờ sáng trước khi rạng đông',
    },

    // --- 9. LANDMARK 81 & URBAN ARCHITECTURAL ILLUMINATION (20 variations) ---
    {
      id: 'lmk_national_flag',
      cat: 'architecture',
      name: 'National Flag Illumination',
      desc: 'Chiếu sáng cờ đỏ sao vàng toàn bộ bề mặt tháp Landmark 81',
    },
    {
      id: 'lmk_rainbow_scroll',
      cat: 'architecture',
      name: 'Rainbow Vertical Scroll',
      desc: 'Dải màu cầu vồng cuộn sóng mượt mà từ chân lên đỉnh tháp',
    },
    {
      id: 'lmk_matrix_digital_rain',
      cat: 'architecture',
      name: 'Matrix Digital Rain Waterfall',
      desc: 'Mưa mã số xanh lục đổ xuống kính tòa nhà',
    },
    {
      id: 'lmk_audio_equalizer',
      cat: 'architecture',
      name: 'Audio Graphic Equalizer',
      desc: 'Cột sóng âm thanh nhảy múa theo tiết tấu nhịp điệu',
    },
    {
      id: 'lmk_sparkling_diamonds',
      cat: 'architecture',
      name: 'Diamond Facet Sparkle',
      desc: 'Đèn LED nhấp nháy như hàng vạn viên kim cương lấp lánh',
    },
    {
      id: 'lmk_golden_pulse',
      cat: 'architecture',
      name: 'Golden Festive Pulse',
      desc: 'Xung ánh sáng vàng kim đập nhịp nhàng như nhịp thở',
    },
    {
      id: 'lmk_spiral_helix',
      cat: 'architecture',
      name: 'Double Spiral Helix',
      desc: 'Vệt sáng xoắn ốc chạy vòng quanh thân tháp lên đỉnh',
    },
    {
      id: 'lmk_beacon_crown',
      cat: 'architecture',
      name: '360deg Rotating Beacon',
      desc: 'Ngọn tháp xoay chùm đèn quét hải đăng 360 độ',
    },
    {
      id: 'lmk_countdown_numbers',
      cat: 'architecture',
      name: 'New Year Countdown Digits',
      desc: 'Hiển thị các con số đếm ngược 5-4-3-2-1 Giao thừa',
    },
    {
      id: 'lmk_spring_flowers',
      cat: 'architecture',
      name: 'Spring Mai Flower Pattern',
      desc: 'Họa tiết hoa mai vàng nở rộ trên mặt dựng kính',
    },
    {
      id: 'lmk_midautumn_moon',
      cat: 'architecture',
      name: 'Mid-Autumn Moon Pattern',
      desc: 'Họa tiết vầng trăng tròn và đàn lồng cá chép',
    },
    {
      id: 'lmk_cascading_waterfall',
      cat: 'architecture',
      name: 'Cyan Waterfall Stream',
      desc: 'Hiệu ứng dòng thác nước ánh sáng xanh ngọc đổ dốc',
    },
    {
      id: 'lmk_laser_beam_apex',
      cat: 'architecture',
      name: 'Apex Skyward Laser Beam',
      desc: 'Tia laser cực mạnh từ đỉnh tháp bắn thẳng lên vũ trụ',
    },
    {
      id: 'lmk_silhouette_unlit',
      cat: 'architecture',
      name: 'Daytime Silhouette Shadow',
      desc: 'Tòa tháp tối đen in bóng khối vững chãi lên nền trời',
    },
    {
      id: 'lmk_sunset_reflection',
      cat: 'architecture',
      name: 'Glass Sunset Glare Reflection',
      desc: 'Mặt kính tháp bắt trọn ánh sáng mặt trời lặn vàng óng',
    },
    {
      id: 'lmk_dawn_gilding',
      cat: 'architecture',
      name: 'Dawn First Sunlight Tip',
      desc: 'Đỉnh tháp đón tia nắng đầu tiên trước khi mặt đất bừng sáng',
    },
    {
      id: 'lmk_festive_red_gold',
      cat: 'architecture',
      name: 'Vietnamese Red-Gold Bands',
      desc: 'Các dải màu đỏ và vàng đan xen trang trọng',
    },
    {
      id: 'lmk_strobe_burst',
      cat: 'architecture',
      name: 'Synchronized Strobe Flash',
      desc: 'Chớp sáng đồng loạt toàn bộ các tầng tháp',
    },
    {
      id: 'lmk_fog_shrouded',
      cat: 'architecture',
      name: 'Fog-Shrouded Crown',
      desc: 'Đỉnh tháp chìm lấp ló trong màn sương mây mờ',
    },
    {
      id: 'lmk_searchlight_converge',
      cat: 'architecture',
      name: 'Searchlight Apex Convergence',
      desc: '4 luồng đèn pha từ mặt đất hội tụ về chóp tháp',
    },

    // --- 10. INTERACTION COMBINATIONS & SPATIAL DYNAMICS (25 variations) ---
    {
      id: 'int_wind_smoke_drift',
      cat: 'interactions',
      name: 'Wind-Driven Smoke Dispersion',
      desc: 'Gió tản khói pháo hoa theo vận tốc vector thực',
    },
    {
      id: 'int_wind_cloud_accel',
      cat: 'interactions',
      name: 'Wind Velocity Cloud Advection',
      desc: 'Mây trôi nhanh chậm theo tốc độ gió môi trường',
    },
    {
      id: 'int_wind_petal_flutter',
      cat: 'interactions',
      name: 'Aerodynamic Petal Turbulence',
      desc: 'Gió giật làm cánh hoa mai bay nhấp nhô lượn sóng',
    },
    {
      id: 'int_wind_kite_tilt',
      cat: 'interactions',
      name: 'Dynamic Kite Line Tension',
      desc: 'Cánh diều nghiêng góc đón gió tự điều chỉnh cân bằng',
    },
    {
      id: 'int_wind_rain_slant',
      cat: 'interactions',
      name: 'Wind-Sheared Rain Vectors',
      desc: 'Gió bẻ nghiêng góc rơi của hạt mưa trên toàn màn hình',
    },
    {
      id: 'int_wind_paperplane_bank',
      cat: 'interactions',
      name: 'Thermal Draft Paperplane Lift',
      desc: 'Máy bay giấy lượn sóng phản hồi theo luồng gió ngang',
    },
    {
      id: 'int_lightning_cloud_flash',
      cat: 'interactions',
      name: 'Cloud Volume Backlight',
      desc: 'Sét chiếu sáng thể tích đám mây phía sau',
    },
    {
      id: 'int_lightning_silhouette_pop',
      cat: 'interactions',
      name: 'Skyline Rim Illumination',
      desc: 'Tia chớp làm nổi bật viền đen skyline thành phố',
    },
    {
      id: 'int_lightning_startle_boids',
      cat: 'interactions',
      name: 'Thunder Shockwave Boids Startle',
      desc: 'Tiếng nổ làm bầy chim và boids giật mình tản mác',
    },
    {
      id: 'int_firework_illum_sky',
      cat: 'interactions',
      name: 'Explosive Sky Tinting',
      desc: 'Vòm nổ pháo hoa nhuộm màu bầu trời đêm xung quanh',
    },
    {
      id: 'int_firework_river_reflect',
      cat: 'interactions',
      name: 'Specular River Surface Shimmer',
      desc: 'Ánh pháo hoa in bóng lung linh trên mặt nước sông',
    },
    {
      id: 'int_firework_startle_flock',
      cat: 'interactions',
      name: 'Acoustic Shockwave Dispersion',
      desc: 'Sóng âm thanh pháo hoa đẩy bầy chim dạt ra xa',
    },
    {
      id: 'int_sun_cloud_shadow',
      cat: 'interactions',
      name: 'Ground Cloud Shadow Occlusion',
      desc: 'Bóng mây che nắng làm tối tạm thời một vệt cảnh nền',
    },
    {
      id: 'int_sun_rim_avatar',
      cat: 'interactions',
      name: 'Real-Time Sun Rim Synchronization',
      desc: 'Góc mặt trời 24h điều khiển viền sáng bức ảnh avatar',
    },
    {
      id: 'int_rain_rainbow_cascade',
      cat: 'interactions',
      name: 'Post-Precipitation Rainbow Arc',
      desc: 'Mưa tạnh kết hợp nắng tạo cung cầu vồng 42 độ',
    },
    {
      id: 'int_storm_overcast_dim',
      cat: 'interactions',
      name: 'Convective Storm Daylight Dimm',
      desc: 'Bão dông làm giảm độ sáng toàn bộ static header',
    },
    {
      id: 'int_drone_formation_mesh',
      cat: 'interactions',
      name: 'Swarm Mesh Inter-Drone Distance',
      desc: 'Dàn drone giữ cự ly mạng lưới khi tạo hình khối',
    },
    {
      id: 'int_aircraft_contrail_spread',
      cat: 'interactions',
      name: 'Contrail Atmospheric Diffusion',
      desc: 'Vệt khói máy bay tản rộng dần theo thời gian trôi',
    },
    {
      id: 'int_aircraft_wash_boids',
      cat: 'interactions',
      name: 'Vortex Wash Boids Avoidance',
      desc: 'Luồng xoáy máy bay làm các cánh chim lân cận né tránh',
    },
    {
      id: 'int_moon_halo_cloud_filter',
      cat: 'interactions',
      name: 'Cirrostratus Hexagonal Refraction',
      desc: 'Tinh thể băng tầng mây ti tạo quầng sáng quanh trăng',
    },
    {
      id: 'int_hover_avoid_boids',
      cat: 'interactions',
      name: 'UI Target Hover Framing Buffer',
      desc: 'Chuột rê vào nút bấm làm đàn con trỏ né tạo khung chữ',
    },
    {
      id: 'int_click_shockwave_boids',
      cat: 'interactions',
      name: 'Kinetic Shockwave Impulse Ring',
      desc: 'Click chuột tạo sóng đẩy văng bầy con trỏ xung quanh',
    },
    {
      id: 'int_pointerdown_bubble_boids',
      cat: 'interactions',
      name: 'Tactile Pointer Press Repulsion',
      desc: 'Nhấn giữ chuột tạo bong bóng áp lực đẩy boids 90px',
    },
    {
      id: 'int_builder_settle_shimmer',
      cat: 'interactions',
      name: 'Builder Assembly Completion Glow',
      desc: 'Agent dựng xong phần tử phát viền sáng lấp lánh',
    },
    {
      id: 'int_midnight_smooth_phase',
      cat: 'interactions',
      name: 'Midnight Monotonic Color Bridge',
      desc: 'Chuyển giao qua nửa đêm không giật nhảy màu sắc',
    },
  ];

  /* ---------- 5. Cascading Composite Sequences Controller ---------- */

  const CASCADES = {
    cascade_thunderstorm: {
      name: 'Giông Bão Đa Tầng Liên Hoàn',
      stages: [
        { at: 0, action: () => Portfolio.ambientEnvironment?.wind.setWind(-1.5, -2.5) },
        { at: 500, action: () => Portfolio.ambient?.trigger('cloudshadows') },
        { at: 2000, action: () => Portfolio.ambient?.trigger('lightning') },
        { at: 3500, action: () => Portfolio.ambient?.trigger('storm') },
        { at: 7000, action: () => Portfolio.ambient?.trigger('shower') },
        { at: 18000, action: () => Portfolio.ambient?.trigger('rainbow') },
      ],
    },
    cascade_newyear_eve: {
      name: 'Đại Tiệc Giao Thừa Hoành Tráng',
      stages: [
        { at: 0, action: () => Portfolio.ambient?.trigger('newyear') },
        { at: 2500, action: () => Portfolio.ambient?.trigger('landmark') },
        { at: 6000, action: () => Portfolio.ambient?.trigger('fireworks') },
        { at: 12000, action: () => Portfolio.ambient?.trigger('grandshow') },
        { at: 22000, action: () => Portfolio.ambient?.trigger('lanterns') },
      ],
    },
    cascade_tet_morning: {
      name: 'Sáng Mùng 1 Tết Sài Gòn',
      stages: [
        { at: 0, action: () => Portfolio.ambientCalendar?.setOverrideHour(7.5) },
        { at: 500, action: () => Portfolio.ambient?.trigger('tet') },
        { at: 3000, action: () => Portfolio.ambient?.trigger('swallows') },
        { at: 7000, action: () => Portfolio.ambient?.trigger('blossoms') },
      ],
    },
    cascade_twilight_flight: {
      name: 'Hoàng Hôn Sông Sài Gòn Chuyển Đêm',
      stages: [
        { at: 0, action: () => Portfolio.ambientCalendar?.setOverrideHour(17.5) },
        { at: 800, action: () => Portfolio.ambient?.trigger('kites') },
        { at: 4000, action: () => Portfolio.ambient?.trigger('contrail') },
        { at: 9000, action: () => Portfolio.ambient?.trigger('bats') },
        { at: 15000, action: () => Portfolio.ambientCalendar?.setOverrideHour(19.2) },
      ],
    },
    cascade_drone_laser: {
      name: 'Đại Nhạc Hội Ánh Sáng & Drone Show',
      stages: [
        { at: 0, action: () => Portfolio.ambient?.trigger('searchlights') },
        { at: 3000, action: () => Portfolio.ambient?.trigger('lasers') },
        { at: 7000, action: () => Portfolio.ambient?.trigger('drones') },
        { at: 14000, action: () => Portfolio.ambient?.trigger('landmark') },
      ],
    },
    cascade_national_celebration: {
      name: 'Mừng Ngày Quốc Khánh 2/9 Sài Gòn',
      stages: [
        { at: 0, action: () => Portfolio.ambient?.trigger('helicopter') },
        { at: 3500, action: () => Portfolio.ambient?.trigger('nationalday') },
        { at: 8000, action: () => Portfolio.ambient?.trigger('banner') },
        { at: 14000, action: () => Portfolio.ambient?.trigger('fireworks') },
      ],
    },
  };

  class AmbientEnvironment {
    constructor() {
      this.wind = new WindEngine();
      this.illumination = new IlluminationBus();
      this.interactionMatrix = INTERACTION_MATRIX;
      this.variationsCatalog = VARIATIONS_CATALOG;
      this.activeCascadeTimers = [];
    }

    tick(dt = 0.016) {
      this.wind.tick(dt);
      this.illumination.tick(dt);
    }

    notifyDisturbance(x, y, _radius = 250, intensity = 1) {
      if (typeof window !== 'undefined' && window.Portfolio?.swarmFlock) {
        window.Portfolio.swarmFlock.addRipple?.(x, y, intensity);
      }
    }

    triggerCascade(name) {
      const cascade = CASCADES[name];
      if (!cascade) return false;

      // Clear any prior cascade
      this.activeCascadeTimers.forEach((id) => clearTimeout(id));
      this.activeCascadeTimers = [];

      // Enter ambient mode and lock
      if (Portfolio.ambient) {
        Portfolio.ambient.locked = true;
        Portfolio.ambient.enter();
      }

      cascade.stages.forEach((st) => {
        const id = setTimeout(() => {
          st.action();
        }, st.at);
        this.activeCascadeTimers.push(id);
      });

      return true;
    }

    getVariations(category) {
      if (!category || category === 'all') return this.variationsCatalog;
      return this.variationsCatalog.filter((v) => v.cat === category);
    }

    getVariation(id) {
      return this.variationsCatalog.find((v) => v.id === id);
    }

    countVariations() {
      return this.variationsCatalog.length;
    }
  }

  Portfolio.ambientEnvironment = new AmbientEnvironment();
})((window.Portfolio = window.Portfolio || {}));
