export default function BookCoverPlaceholder({ title }: { title: string }) {
  return (
    <img
      src="/images/libro_placeholder.png"
      alt={title}
      className="w-full h-full object-cover"
    />
  );
}
