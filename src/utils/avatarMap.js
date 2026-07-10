import image15     from "../images/image15.png";
import zo          from "../images/zo.png";
import cheo        from "../images/cheo.png";
import hong        from "../images/image_hong.png";
import bae         from "../images/image_bae.png";
import hwang       from "../images/image_hwang.png";
import park        from "../images/image_park.png";
import kim_jh      from "../images/image_kim_jh.png";
import yu          from "../images/image_yu.png";
import jeon        from "../images/image_jeon.png";
import shin_jw     from "../images/image_shin_jw.png";
import kim_sh      from "../images/image_kim_sh.png";
import choi_sy     from "../images/image_choi_sy.png";
import jung        from "../images/image_jung.png";
import lee_yh      from "../images/image_lee_yh.png";
import seo         from "../images/image_seo.png";
import kim_yj      from "../images/image_kim_yj.png";
import seo_j       from "../images/seo_j.png";
import kim_ye      from "../images/kim_ye.png";
import lee_sy      from "../images/lee_sy.png";
import jung_jw     from "../images/jung_jw.png";
import kim_yn      from "../images/kim_yn.png";
import han_ja      from "../images/han_ja.png";
import kim_jw      from "../images/kim_jw.png";
import moon_jh     from "../images/moon_jh.png";
import jung_sm     from "../images/jung_sm.png";
import seol_yw     from "../images/seol_yw.png";
import kim_mj      from "../images/kim_mj.png";
import lee_tk      from "../images/lee_tk.png";
import seong_hj    from "../images/seong_hj.png";
import planData    from "../data/planData.json";

export const avatarMap = {
  "image15.png":       image15,
  "zo.png":            zo,
  "cheo.png":          cheo,
  "image_hong.png":    hong,
  "image_bae.png":     bae,
  "image_hwang.png":   hwang,
  "image_park.png":    park,
  "image_kim_jh.png":  kim_jh,
  "image_yu.png":      yu,
  "image_jeon.png":    jeon,
  "image_shin_jw.png": shin_jw,
  "image_kim_sh.png":  kim_sh,
  "image_choi_sy.png": choi_sy,
  "image_jung.png":    jung,
  "image_lee_yh.png":  lee_yh,
  "image_seo.png":     seo,
  "image_kim_yj.png":  kim_yj,
  "seo_j.png":         seo_j,
  "kim_ye.png":        kim_ye,
  "lee_sy.png":        lee_sy,
  "jung_jw.png":       jung_jw,
  "kim_yn.png":        kim_yn,
  "han_ja.png":        han_ja,
  "kim_jw.png":        kim_jw,
  "moon_jh.png":       moon_jh,
  "jung_sm.png":       jung_sm,
  "seol_yw.png":       seol_yw,
  "kim_mj.png":        kim_mj,
  "lee_tk.png":        lee_tk,
  "seong_hj.png":      seong_hj,
};

export const defaultAvatar = image15;

const _nameToAvatarKey = {};
Object.values(planData).forEach((cohort) => {
  (cohort.members ?? []).forEach((m) => {
    _nameToAvatarKey[m.name] = m.avatarKey;
  });
});
export const nameToAvatarKey = _nameToAvatarKey;

export function getAvatarByName(name) {
  const key = nameToAvatarKey[name];
  return (key && avatarMap[key]) || defaultAvatar;
}
