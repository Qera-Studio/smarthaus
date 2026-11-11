import {
  cloneElement,
  createElement,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

/**
 * Server Components that read Sanity are async, and React Testing Library
 * renders on the client, where an async component cannot run. This awaits
 * every async component in a tree, depth first, and puts what it returned in
 * its place, so what is left is the tree the server would have streamed:
 * client components and plain elements, which RTL renders as usual.
 *
 * Content comes from the getDoc mock in jest.setup.ts, which serves the seed.
 */
type AnyProps = Record<string, unknown> & { children?: ReactNode };

function isAsync(type: unknown): type is (props: AnyProps) => Promise<ReactNode> {
  return typeof type === "function" && type.constructor.name === "AsyncFunction";
}

export async function resolve(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(resolve));
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<AnyProps>;
  if (isAsync(element.type)) {
    const output = await resolve(await element.type(element.props));
    // Keep a keyed element keyed, so a list of them stays a valid list.
    return element.key === null ? output : <Fragment key={element.key}>{output}</Fragment>;
  }

  // Elements passed as props (a slot such as `cta` or `intro`) can hold async
  // components too, so every prop that is a node is resolved, not only children.
  // Arrays go back as separate arguments, as JSX passes static children: handed
  // back as one array, React would read them as a list and ask for keys.
  const props: AnyProps = {};
  let changed = false;
  for (const [key, value] of Object.entries(element.props)) {
    if (key === "children") continue;
    const holdsElements =
      isValidElement(value) || (Array.isArray(value) && value.some(isValidElement));
    if (holdsElements) {
      const resolved = await resolve(value as ReactNode);
      props[key] = Array.isArray(resolved) ? createElement(Fragment, null, ...resolved) : resolved;
      changed = true;
    }
  }
  const { children } = element.props;
  if (isValidElement(children) || Array.isArray(children)) {
    const resolved = await resolve(children);
    return cloneElement(element, props, ...(Array.isArray(resolved) ? resolved : [resolved]));
  }
  return changed ? cloneElement(element, props) : element;
}
