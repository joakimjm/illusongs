import { Body, Heading } from "@/components/typography";

type HeroHeaderProps = {
  readonly title: string;
  readonly description: string;
};

export const HeroHeader = ({ title, description }: HeroHeaderProps) => (
  <div className="flex flex-col gap-3">
    <Heading level={1} className="text-4xl leading-tight sm:text-5xl">
      {title}
    </Heading>
    <Body className="sm:text-lg">{description}</Body>
  </div>
);
