import { useEffect, useState } from 'react'
import type { PersonaPublic } from '../../store/personas'

/**
 * Mały/średni okrągły awatar persony używany w listach (dropdown, karty sklepu,
 * ustawienia). Spójny look niezależnie od miejsca i rozmiaru.
 *
 * Reguły renderu:
 * 1. Subskrypcik ma legacy ścieżkę `/subskrypcik-avatar.png` (zdjęcie 3D-głowy
 *    z `public/`); pozostałe próbują `/persona-avatar-{id}.png`.
 * 2. Brak pliku → `onError` → fallback do emoji z DB.
 * 3. Tło ZAWSZE neutralne (`bg-bg-subtle`) — bez krzykliwych granatów/terakot
 *    pod emoji. Zdjęcie 3D-głowy ma własne ciemne tło w pliku, więc i tak
 *    wygląda dobrze. Branding kolorem akcentu zostaje tylko w WelcomeIntro
 *    (big hero avatar).
 *
 * Reset stanu przy zmianie persony gwarantuje że nowy obrazek dostanie szansę
 * się załadować po podmianie aktywnego doradcy.
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
  const emoji = persona?.avatar_emoji ?? '💸'
  const name = persona?.name ?? 'Subskrypcik'

  const [imgFailed, setImgFailed] = useState(false)
  useEffect(() => {
    setImgFailed(false)
  }, [id])

  // Emoji ~55% wysokości awatara — spójnie w każdym rozmiarze.
  const emojiSize = Math.round(size * 0.55)

  return (
    <div
      className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-subtle"
      style={{ width: size, height: size }}
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
