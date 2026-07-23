import { ArrowUpRight } from 'lucide-react';

interface Props {
  title: string;
  description?: string;
}

// Placeholder used during Phase U1 only. Replaced in U2–U4.
export default function PageStub({ title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mb-4">
        <ArrowUpRight className="w-7 h-7 text-primary" />
      </div>
      <h1 className="font-headline-md text-headline-md text-on-surface mb-2 tracking-tight">
        {title}
      </h1>
      <p className="text-[11px] font-semibold tracking-widest text-outline uppercase mb-3">
        Coming Soon — Phase U1 Scaffold
      </p>
      {description && (
        <p className="text-body text-on-surface-variant max-w-md">{description}</p>
      )}
    </div>
  );
}
