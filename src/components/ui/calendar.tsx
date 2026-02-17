import * as React from "react"
import { DayPicker } from "react-day-picker"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-2",
        month: "flex flex-col gap-4",
        month_caption: "flex justify-center pt-1 relative items-center w-full",
        caption_label: "text-sm font-medium text-text-primary",
        nav: "flex items-center gap-1",
        button_previous:
          "absolute left-1 top-0 z-10 inline-flex items-center justify-center rounded-lg w-7 h-7 bg-transparent hover:bg-black/4 text-text-secondary transition-colors",
        button_next:
          "absolute right-1 top-0 z-10 inline-flex items-center justify-center rounded-lg w-7 h-7 bg-transparent hover:bg-black/4 text-text-secondary transition-colors",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "text-text-tertiary rounded-md w-9 font-normal text-[0.8rem] flex items-center justify-center",
        week: "flex w-full mt-2",
        day: "relative p-0 text-center text-sm h-9 w-9 flex items-center justify-center rounded-lg transition-colors hover:bg-black/4 focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-rose-50",
        day_button:
          "inline-flex items-center justify-center h-9 w-9 p-0 font-normal text-text-primary rounded-lg transition-colors cursor-pointer aria-selected:opacity-100",
        selected:
          "bg-text-primary text-white hover:bg-text-primary hover:text-white focus:bg-text-primary focus:text-white rounded-lg [&>button]:text-white [&>button]:hover:text-white",
        today: "bg-rose-50 text-rose-600 font-semibold",
        outside:
          "text-gray-300 aria-selected:bg-black/4 aria-selected:text-text-tertiary",
        disabled: "text-gray-300 opacity-50",
        hidden: "invisible",
        range_middle:
          "aria-selected:bg-rose-50 aria-selected:text-text-primary",
        range_start: "rounded-l-lg",
        range_end: "rounded-r-lg",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight
          return <Icon className="h-4 w-4" />
        },
      }}
      {...props}
    />
  )
}

Calendar.displayName = "Calendar"

export { Calendar }
