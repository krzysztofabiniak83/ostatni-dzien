import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { Bold, Italic, List, ListOrdered, Quote } from 'lucide-react'
import clsx from 'clsx'

interface RichTextEditorProps {
  /** Aktualna treść jako HTML. Pusta = ''. */
  value: string
  onChange: (html: string) => void
  placeholder?: string
  /** Limit znaków (plain-text). Pomija formatowanie. */
  maxLength?: number
  /** Czy pokazać pasek narzędziowy na górze. */
  showToolbar?: boolean
  /** Auto-focus przy mount. */
  autoFocus?: boolean
  className?: string
}

/** Pojedynczy przycisk toolbar — toggluje stan formatowania w aktywnym zaznaczeniu. */
function ToolButton({
  editor,
  label,
  active,
  onClick,
  children,
}: {
  editor: Editor | null
  label: string
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => {
        // Zapobiegaj utracie zaznaczenia w edytorze przy kliku na toolbar.
        e.preventDefault()
        if (editor) onClick()
      }}
      className={clsx(
        'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
        active
          ? 'bg-accent-soft text-accent'
          : 'text-ink-secondary hover:bg-bg-subtle hover:text-ink-primary',
      )}
    >
      {children}
    </button>
  )
}

/**
 * Reusable rich-text editor oparty na Tiptap (ProseMirror).
 * Wspiera bold, italic, listy (ul/ol), cytat. Treść wraca jako HTML.
 * Może być użyty w formularzach (np. opis subskrypcji) lub do wysyłania
 * wiadomości w aplikacji.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Napisz coś…',
  maxLength,
  showToolbar = true,
  autoFocus = false,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Wyłączamy heading w MVP — zbyt duże dla form/wiadomości.
        heading: false,
        // Codeblock też zbędny.
        codeBlock: false,
        horizontalRule: false,
      }),
      Placeholder.configure({ placeholder }),
      ...(maxLength ? [CharacterCount.configure({ limit: maxLength })] : []),
    ],
    content: value,
    autofocus: autoFocus,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      // Tiptap zwraca '<p></p>' dla pustego — normalizujemy do ''.
      onChange(html === '<p></p>' ? '' : html)
    },
    editorProps: {
      attributes: {
        class: 'ProseMirror',
      },
    },
  })

  const remaining = maxLength && editor ? maxLength - editor.storage.characterCount.characters() : null

  return (
    <div
      className={clsx(
        'flex flex-col gap-2 rounded-md border border-hairline bg-bg-card p-3 transition-colors focus-within:border-accent',
        className,
      )}
    >
      {showToolbar && (
        <div className="flex items-center gap-1 border-b border-hairline pb-2">
          <ToolButton
            editor={editor}
            label="Pogrubienie"
            active={editor?.isActive('bold') ?? false}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" strokeWidth={2} />
          </ToolButton>
          <ToolButton
            editor={editor}
            label="Kursywa"
            active={editor?.isActive('italic') ?? false}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" strokeWidth={2} />
          </ToolButton>
          <span className="mx-1 h-5 w-px bg-hairline" />
          <ToolButton
            editor={editor}
            label="Lista punktowana"
            active={editor?.isActive('bulletList') ?? false}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" strokeWidth={1.8} />
          </ToolButton>
          <ToolButton
            editor={editor}
            label="Lista numerowana"
            active={editor?.isActive('orderedList') ?? false}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" strokeWidth={1.8} />
          </ToolButton>
          <ToolButton
            editor={editor}
            label="Cytat"
            active={editor?.isActive('blockquote') ?? false}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="h-4 w-4" strokeWidth={1.8} />
          </ToolButton>
        </div>
      )}

      <EditorContent editor={editor} />

      {maxLength && remaining !== null && (
        <div
          className={clsx(
            'self-end font-mono text-[10px] uppercase tracking-[0.1em]',
            remaining < 20 ? 'text-alert' : 'text-ink-tertiary',
          )}
        >
          {remaining} / {maxLength}
        </div>
      )}
    </div>
  )
}

/** Helper: HTML z Tiptapa → plain text (dla mailto / podsumowania). */
export function htmlToPlainText(html: string): string {
  if (typeof window === 'undefined') return html.replace(/<[^>]+>/g, '')
  const div = document.createElement('div')
  div.innerHTML = html
  // Podmień <br> i bloki na \n.
  div.querySelectorAll('br').forEach((b) => b.replaceWith('\n'))
  div.querySelectorAll('p, li, blockquote').forEach((el) => {
    el.append('\n')
  })
  div.querySelectorAll('li').forEach((li) => {
    li.prepend('• ')
  })
  return (div.textContent || '').replace(/\n{3,}/g, '\n\n').trim()
}
