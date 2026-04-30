/**
 * Render TipTap JSON content as plain HTML on the server.
 * Minimal renderer covering the node types the editor produces.
 */

type Node = {
  type: string;
  content?: Node[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  attrs?: Record<string, unknown>;
};

function renderNode(node: Node, key: string): React.ReactNode {
  switch (node.type) {
    case "doc":
      return node.content?.map((c, i) => renderNode(c, `${key}-${i}`));
    case "paragraph":
      return (
        <p key={key}>
          {node.content?.map((c, i) => renderNode(c, `${key}-${i}`))}
        </p>
      );
    case "heading": {
      const level = (node.attrs?.level as number) ?? 2;
      const content = node.content?.map((c, i) => renderNode(c, `${key}-${i}`));
      if (level === 1) return <h1 key={key}>{content}</h1>;
      if (level === 2) return <h2 key={key}>{content}</h2>;
      if (level === 3) return <h3 key={key}>{content}</h3>;
      return <h4 key={key}>{content}</h4>;
    }
    case "bulletList":
      return (
        <ul key={key}>
          {node.content?.map((c, i) => renderNode(c, `${key}-${i}`))}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key}>
          {node.content?.map((c, i) => renderNode(c, `${key}-${i}`))}
        </ol>
      );
    case "listItem":
      return (
        <li key={key}>
          {node.content?.map((c, i) => renderNode(c, `${key}-${i}`))}
        </li>
      );
    case "blockquote":
      return (
        <blockquote key={key}>
          {node.content?.map((c, i) => renderNode(c, `${key}-${i}`))}
        </blockquote>
      );
    case "horizontalRule":
      return <hr key={key} />;
    case "hardBreak":
      return <br key={key} />;
    case "image": {
      const src = (node.attrs?.src as string) ?? "";
      const alt = (node.attrs?.alt as string) ?? "";
      if (!src) return null;
      // eslint-disable-next-line @next/next/no-img-element
      return (
        <img
          key={key}
          src={src}
          alt={alt}
          className="rounded-sm border border-border my-3 max-w-full h-auto"
          loading="lazy"
        />
      );
    }
    case "text": {
      let el: React.ReactNode = node.text;
      for (const m of node.marks ?? []) {
        if (m.type === "bold") el = <strong key={key}>{el}</strong>;
        else if (m.type === "italic") el = <em key={key}>{el}</em>;
        else if (m.type === "code") el = <code key={key}>{el}</code>;
        else if (m.type === "link") {
          const href = (m.attrs?.href as string) ?? "#";
          el = (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer nofollow"
            >
              {el}
            </a>
          );
        }
      }
      return el;
    }
    default:
      return null;
  }
}

export function ArticleBody({ content }: { content: unknown }) {
  if (!content || typeof content !== "object") return null;
  return <>{renderNode(content as Node, "root")}</>;
}
