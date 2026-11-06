import { AnimatePresence, motion } from "motion/react";
import { AVATAR_GROUPS, AVATARS, avatarName } from "../../../shared/avatars";
import type { User } from "../../../shared/types";
import { Avatar } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { Sheet } from "../../ui/Sheet";
import { useToast } from "../../ui/Toast";
import { useUpdateProfile } from "../auth/useMe";

export function AvatarSheet({ user, open, onClose }: { user: User; open: boolean; onClose: () => void }) {
  const update = useUpdateProfile();
  const toast = useToast();

  const choose = (avatar: string | null) =>
    update.mutate({ avatar }, { onError: (error) => toast({ message: error.message }) });

  const surprise = () => {
    const others = AVATARS.filter((a) => a.id !== user.avatar);
    choose(others[Math.floor(Math.random() * others.length)]!.id);
  };

  return (
    <Sheet open={open} tall title="Elige tu avatar" onClose={onClose}>
      <div className="avatar-picker">
        <div className="avatar-picker__top">
          <div className="avatar-picker__preview" aria-live="polite">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={user.avatar ?? "inicial"}
                initial={{ scale: 0.4, rotate: -14, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ type: "spring", stiffness: 420, damping: 16 }}
              >
                <Avatar avatar={user.avatar} name={user.displayName} accent={user.accent} size={96} />
              </motion.div>
            </AnimatePresence>
            <div className="avatar-picker__who">
              <strong>{avatarName(user.avatar) ?? "Sin avatar"}</strong>
              <span>{user.displayName}</span>
            </div>
          </div>

          <div className="avatar-picker__actions">
            <Button variant="secondary" onClick={surprise}>
              🎲 Sorpréndeme
            </Button>
            <Button onClick={onClose}>Listo</Button>
          </div>
        </div>

        {AVATAR_GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="section-title">{group.title}</h3>
            <div className="avatar-grid">
              {group.avatars.map((a) => (
                <motion.button
                  key={a.id}
                  type="button"
                  className="avatar-option"
                  aria-pressed={user.avatar === a.id}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 600, damping: 24 }}
                  onClick={() => choose(a.id)}
                >
                  <img src={`/avatares/${a.id}.webp`} alt="" width={56} height={56} loading="lazy" decoding="async" />
                  <span>{a.name}</span>
                </motion.button>
              ))}
            </div>
          </section>
        ))}

        {user.avatar && (
          <Button variant="ghost" onClick={() => choose(null)}>
            Usar mi inicial
          </Button>
        )}
      </div>
    </Sheet>
  );
}
