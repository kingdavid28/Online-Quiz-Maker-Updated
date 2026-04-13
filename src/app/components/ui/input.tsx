import * as React from "react";
import { cn } from "./utils";
import { Eye, EyeOff } from "lucide-react";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  const [showPassword, setShowPassword] = React.useState(false);
  const isPassword = type === "password";

  return (
    <div className="relative">
      <input
        type={isPassword && showPassword ? "text" : type}
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base bg-input-background transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          isPassword ? "pr-10" : "",
          className,
        )}
        {...props}
      />
      {isPassword && (
        <button
          type="button"
          className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-500 hover:text-gray-700 focus:outline-none focus:text-indigo-600 transition-colors"
          onClick={() => setShowPassword(!showPassword)}
          tabIndex={-1}
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );
}

export { Input };
