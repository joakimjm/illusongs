import { Body, Heading } from "@/components/typography";

type HeroHeaderProps = {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
};

export const HeroHeader = ({
  eyebrow,
  title,
  description,
}: HeroHeaderProps) => (
  <div className="flex flex-col gap-4">
    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-400">
      {eyebrow}
    </p>
    <Heading level={1} className="text-4xl leading-tight sm:text-5xl">
      {title}
    </Heading>
    <Body className="sm:text-lg">{description}</Body>
  </div>
);
