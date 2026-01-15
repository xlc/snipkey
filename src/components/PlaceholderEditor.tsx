import type { PlaceholderSegment } from '@shared/template'
import { useEffect, useState } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '~/components/ui/sheet'
import { Textarea } from '~/components/ui/textarea'
import { useMediaQuery } from '~/lib/hooks/useMediaQuery'

interface PlaceholderEditorProps {
	placeholders: PlaceholderSegment[]
	values: Record<string, string>
	onChange: (values: Record<string, string>) => void
}

export function PlaceholderEditor({
	placeholders,
	values,
	onChange,
}: PlaceholderEditorProps) {
	const isDesktop = useMediaQuery('(min-width: 768px)')
	const [openPlaceholder, setOpenPlaceholder] = useState<string | null>(null)
	const [tempValue, setTempValue] = useState('')

	// Find the currently open placeholder
	const activePlaceholder = placeholders.find(ph => ph.name === openPlaceholder)

	// Load current value when opening editor
	useEffect(() => {
		if (openPlaceholder && activePlaceholder) {
			const currentValue = values[openPlaceholder] ?? ''
			setTempValue(currentValue)
		}
	}, [openPlaceholder, activePlaceholder, values])

	function handleOpen(placeholderName: string) {
		setOpenPlaceholder(placeholderName)
	}

	function handleClose() {
		setOpenPlaceholder(null)
		setTempValue('')
	}

	function handleSave() {
		if (openPlaceholder && activePlaceholder) {
			onChange({
				...values,
				[openPlaceholder]: tempValue || activePlaceholder.defaultValue || '',
			})
		}
		handleClose()
	}

	function handleReset() {
		if (openPlaceholder && activePlaceholder && activePlaceholder.defaultValue !== undefined) {
			setTempValue(activePlaceholder.defaultValue)
		}
	}

	const EditorContent = () => (
		<div className="space-y-4">
			<div className="space-y-2">
				<div className="text-sm font-medium">
					{activePlaceholder?.name} ({activePlaceholder?.phType})
				</div>
				{activePlaceholder?.phType === 'text' && (
					<Textarea
						placeholder={activePlaceholder.defaultValue ?? ''}
						value={tempValue}
						onChange={e => setTempValue(e.target.value)}
						rows={4}
						autoFocus
					/>
				)}
				{activePlaceholder?.phType === 'number' && (
					<Input
						type="number"
						placeholder={activePlaceholder.defaultValue ?? ''}
						value={tempValue}
						onChange={e => setTempValue(e.target.value)}
						autoFocus
					/>
				)}
				{activePlaceholder?.phType === 'enum' && (
					<div className="space-y-2">
						{activePlaceholder.options?.map(option => (
							<Button
								key={option}
								type="button"
								variant={tempValue === option ? 'default' : 'outline'}
								className="w-full justify-start"
								onClick={() => setTempValue(option)}
							>
								{option}
								{option === activePlaceholder.defaultValue && ' (default)'}
							</Button>
						))}
					</div>
				)}
				{activePlaceholder?.defaultValue !== undefined && (
					<p className="text-xs text-muted-foreground">
						Default: "{activePlaceholder.defaultValue}"
					</p>
				)}
			</div>
			<div className="flex gap-2">
				<Button onClick={handleSave} className="flex-1">
					Save
				</Button>
				{activePlaceholder?.defaultValue !== undefined && (
					<Button variant="outline" onClick={handleReset}>
						Reset
					</Button>
				)}
			</div>
		</div>
	)

	if (isDesktop) {
		return (
			<fieldset className="flex gap-2 flex-wrap border-0 p-0 m-0">
				<legend className="sr-only">Placeholder values</legend>
				{placeholders.map(placeholder => (
					<Popover
						key={placeholder.name}
						open={openPlaceholder === placeholder.name}
						onOpenChange={open => {
							if (open) {
								handleOpen(placeholder.name)
							} else {
								handleClose()
							}
						}}
					>
						<PopoverTrigger asChild>
							<Badge
								variant="secondary"
								className="cursor-pointer hover:bg-accent"
								aria-label={`Edit ${placeholder.name} placeholder`}
								aria-haspopup="dialog"
							>
								{placeholder.name}
								{values[placeholder.name] && ' ✓'}
							</Badge>
						</PopoverTrigger>
						<PopoverContent className="w-80" align="start">
							<EditorContent />
						</PopoverContent>
					</Popover>
				))}
			</fieldset>
		)
	}

	return (
		<fieldset className="flex gap-2 flex-wrap border-0 p-0 m-0">
			<legend className="sr-only">Placeholder values</legend>
			{placeholders.map(placeholder => (
				<Sheet
					key={placeholder.name}
					open={openPlaceholder === placeholder.name}
					onOpenChange={open => {
						if (open) {
							handleOpen(placeholder.name)
						} else {
							handleClose()
						}
					}}
				>
					<SheetTrigger asChild>
						<Badge
							variant="secondary"
							className="cursor-pointer hover:bg-accent"
							aria-label={`Edit ${placeholder.name} placeholder`}
							aria-haspopup="dialog"
						>
							{placeholder.name}
							{values[placeholder.name] && ' ✓'}
						</Badge>
					</SheetTrigger>
					<SheetContent side="bottom">
						<SheetHeader>
							<SheetTitle>Edit Placeholder</SheetTitle>
							<SheetDescription>Update the value for {placeholder.name}</SheetDescription>
						</SheetHeader>
						<div className="mt-4">
							<EditorContent />
						</div>
					</SheetContent>
				</Sheet>
			))}
		</fieldset>
	)
}
