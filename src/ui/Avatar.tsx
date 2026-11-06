import { isAvatarId } from "../../shared/avatars";
import type { Accent } from "../../shared/types";

interface AvatarProps {
  avatar: string | null;
  name: string;
  accent: Accent;
  size?: number;
  className?: string;
}

/** La imagen elegida o, si aún no hay, la inicial sobre el color de la persona. Es decorativo: el nombre va al lado. */
export function Avatar({ avatar, name, accent, size = 44, className = "" }: AvatarProps) {
  const style = { width: size, height: size, fontSize: size * 0.44 };
  if (isAvatarId(avatar)) {
    return (
      <span className={`avatar ${className}`} style={style} aria-hidden>
        <img src={`/avatares/${avatar}.webp`} alt="" width={size} height={size} decoding="async" />
      </span>
    );
  }
  return (
    <span className={`avatar avatar--initial ${className}`} data-swatch={accent} style={style} aria-hidden>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
