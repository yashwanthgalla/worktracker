import * as React from "react"
import { OTPInput, OTPInputContext } from "input-otp"
import { MinusIcon } from "lucide-react"
import { cn } from "../../lib/utils"

type OTPVariant = "light" | "dark"
const VariantContext = React.createContext<OTPVariant>("light")

function InputOTP({
  className,
  containerClassName,
  variant = "light",
  ...props
}: React.ComponentProps<typeof OTPInput> & { containerClassName?: string; variant?: OTPVariant }) {
  return (
    <VariantContext.Provider value={variant}>
      <OTPInput
        data-slot="input-otp"
        containerClassName={cn(
          "flex items-center gap-2 has-disabled:opacity-50",
          containerClassName,
        )}
        className={cn("disabled:cursor-not-allowed", className)}
        {...props}
      />
    </VariantContext.Provider>
  )
}

function InputOTPGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-group"
      className={cn("flex items-center", className)}
      {...props}
    />
  )
}

function InputOTPSlot({
  index,
  className,
  ...props
}: React.ComponentProps<"div"> & { index: number }) {
  const inputOTPContext = React.useContext(OTPInputContext)
  const variant = React.useContext(VariantContext)
  const { char, hasFakeCaret, isActive } = inputOTPContext.slots[index]

  const isDark = variant === "dark"

  return (
    <div
      data-slot="input-otp-slot"
      data-active={isActive}
      className={cn(
        "relative flex h-12 w-11 items-center justify-center border-y border-r text-xl font-semibold transition-all first:rounded-l-lg first:border-l last:rounded-r-lg",
        isDark
          ? "border-white/20 bg-white/5 text-white"
          : "border-gray-300 bg-white text-gray-900 shadow-sm",
        isActive && (isDark
          ? "z-10 ring-2 ring-blue-500/50 border-blue-500/50"
          : "z-10 ring-2 ring-emerald-500/50 border-emerald-400"),
        className,
      )}
      {...props}
    >
      {char}
      {hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className={cn(
            "animate-caret-blink h-5 w-px duration-1000",
            isDark ? "bg-blue-400" : "bg-emerald-500"
          )} />
        </div>
      )}
    </div>
  )
}

function InputOTPSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-otp-separator"
      role="separator"
      className={cn("flex items-center text-gray-400", className)}
      {...props}
    >
      <MinusIcon className="w-4 h-4" />
    </div>
  )
}

export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator }
