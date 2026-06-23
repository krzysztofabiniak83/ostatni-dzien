import { useEffect, useState } from 'react'
import type { PersonaPublic } from '../../store/personas'

/**
 * Mały okrągły awatar persony używany w listach (dropdown, karty sklepu, ustawienia).
 *
 * Reguły renderu:
 * 1. Subskrypcik ma legacy ścieżkę `/subskrypcik-avatar.png` (zdjęcie 3D-głowy
 *    z `public/`).
 * 2. Pozostałe persony próbują `/persona-avatar-{id}.png`. Jak nie ma pliku,
 *    `onError` przełącza się na fallback.
 * 3. Fallback: `avatar_emoji` z DB na pełnym tle `accent_color` — żeby był
 *    czytelny nawet bez podstawionego renderu 3D.
 *
 * Reset stanu przy zmianie persony (przez `useEffect`) gwarantuje że nowy
 * obrazek dostanie szansę się załadować po podmianie aktywnego doradcy.
 */
export function PersonaAvatar({
  persona,
  size,
}: {
  persona: PersonaPublic | undefined
  size: number
}) {
  const id = persona?.id ?? 'subskrypcik'
  const src = id === 'subskrypcik' ? '/subskrypcik-avatar.png' : `/persona-avatar-${id}.png`
  const accent = persona?.accent_color ?? '#1F3D33'
  const emoji = persona?.avatar_emoji ?? '💸'
  const name = persona?.name ?? 'Subskrypcik'

  const [imgFailed, setImgFailed] = useState(false)
  useEffect(() => {
    setImgFailed(false)
  }, [id])

  // Skalujemy emoji do ~55% wysokości awatara — wygląda spójnie w każdym rozmiarze.
  const emojiSize = Math.round(size * 0.55)

  return (
    <div
      className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full"
      style={{ width: size, height: size, backgroundColor: accent }}
    >
      {!imgFailed ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span style={{ fontSize: emojiSize, lineHeight: 1 }} aria-label={name}>
          {emoji}
        </span>
      )}
    </div>
  )
}
