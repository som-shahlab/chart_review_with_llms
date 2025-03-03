
interface HRHeaderProps {
    title: string;
}

function HRHeader({
    className,
    title,
    ...props
  }: React.ComponentProps<"div"> & HRHeaderProps) {
  
    return (
      <>
        <div className="flex items-center gap-4 w-full">
            <hr className="flex-grow border-t" />
            <h2 className="text-xl font-semibold">{title}</h2>
            <hr className="flex-grow border-t" />
        </div>
    </>
    )
  }
  
  export { HRHeader }


