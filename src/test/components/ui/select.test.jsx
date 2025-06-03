import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

describe('Select Component', () => {
  it('should render without errors', () => {
    expect(() => {
      render(
        <Select>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option1">Option 1</SelectItem>
            <SelectItem value="option2">Option 2</SelectItem>
          </SelectContent>
        </Select>
      )
    }).not.toThrow()
  })

  it('should render the trigger with placeholder text', () => {
    render(
      <Select>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
        </SelectContent>
      </Select>
    )

    expect(screen.getByText('Select an option')).toBeInTheDocument()
  })

  it('should import all required dependencies without errors', () => {
    // This test will fail if there are import/dependency issues
    expect(Select).toBeDefined()
    expect(SelectContent).toBeDefined()
    expect(SelectItem).toBeDefined()
    expect(SelectTrigger).toBeDefined()
    expect(SelectValue).toBeDefined()
  })
})
