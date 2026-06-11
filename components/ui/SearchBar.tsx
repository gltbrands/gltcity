'use client'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'

interface SearchBarProps {
  placeholder?: string
  paramName?: string
}

export default function SearchBar({ placeholder = 'Search…', paramName = 'q' }: SearchBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const params = new URLSearchParams(searchParams.toString())
    if (e.target.value) params.set(paramName, e.target.value)
    else params.delete(paramName)
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams, paramName])

  return (
    <input
      type="search"
      defaultValue={searchParams.get(paramName) ?? ''}
      onChange={handleChange}
      placeholder={placeholder}
      className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        color: 'var(--foreground)',
      }}
      onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
      onBlur={e => (e.target.style.borderColor = 'var(--border)')}
    />
  )
}
