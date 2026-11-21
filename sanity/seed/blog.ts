// The blog as it was first published: the articles page and four articles.
//
// "One Home, Five Vendors" is Shivanshu's text (2026-11-14). The other three
// were drafted the same day for his review, approved as written (2026-11-19)
// and in search since 2026-11-20. Anything they say about Smarthaus itself is
// from the confirmed list in AGENTS.md (claims audit): the visit, the fixed
// itemised price, work in homes already lived in, the record left behind.
// Everything else is general advice and names no figure.
//
// Every picture is licensed stock, marked as such; the three card pictures
// are 384px wide and wait on larger originals.
import type { ArticleBlock, ArticleNode, BlogPage, Post } from "../../src/sanity/types";
import type { Picture } from "../../src/sanity/localize";

type Draft = Omit<ArticleBlock, "_key" | "children"> & { text: string };
type Piece = Draft | { image: Picture; caption?: string };

const block =
  (style: NonNullable<ArticleBlock["style"]>) =>
  (text: string): Draft => ({
    _type: "block",
    style,
    text,
  });
const p = block("normal");
const h2 = block("h2");
const quote = block("blockquote");
const box = block("callout");
const li = (text: string): Draft => ({ ...p(text), listItem: "bullet", level: 1 });
const image = (picture: Picture, caption?: string): Piece => ({
  image: picture,
  ...(caption ? { caption } : {}),
});

/** Portable Text, with the keys Sanity needs: stable, by position. */
function body(pieces: Piece[]): ArticleNode[] {
  return pieces.map((piece, i): ArticleNode => {
    if ("image" in piece) return { _type: "articleImage", _key: `n${i}`, ...piece };
    const { text, ...rest } = piece;
    return {
      ...rest,
      _key: `n${i}`,
      markDefs: [],
      children: [{ _type: "span", _key: `n${i}s0`, text, marks: [] }],
    };
  });
}

const AUTHOR = "Sunil Pareek";

export const BLOG_PAGE: BlogPage = {
  seo: {
    title: "Articles on smart homes in Dubai",
    description:
      "Plain advice on planning, installing and living with a smart home in Dubai: networks, security, controls and what to ask before you buy.",
    index: true,
  },
  heading: "Articles",
};

const FIVE_VENDORS: Post = {
  title: "One Home, Five Vendors: The Hidden Cost of a Piecemeal Smart Home",
  slug: "one-home-five-vendors",
  author: AUTHOR,
  date: "2026-11-05",
  tags: ["Planning", "Security"],
  excerpt:
    "Most smart homes aren’t planned. They pile up one device at a time, and the trouble shows up later.",
  image: {
    src: "/blog/one-home-five-vendors.png",
    width: 1000,
    height: 562,
    alt: "A living room at dusk with a wall panel and a door sensor lit beside the entrance",
    stock: true,
  },
  body: body([
    p(
      "Most smart homes in Dubai aren’t designed. They pile up. Cameras go in first, often with the move. A smart lock comes a year later from a different supplier. Then a speaker system, a video doorbell, maybe a thermostat someone picked up on a weekend. Each one works fine by itself. Together, they turn into five apps, five warranties and five companies to call when something stops working.",
    ),
    h2("Where it starts to break"),
    p(
      "The real cost shows up when something goes wrong. The doorbell drops offline and the installer says it’s your Wi-Fi. The network company says it’s the doorbell. The camera supplier says that isn’t their device. Each vendor is responsible for their own piece, so nobody is responsible for the whole home.",
    ),
    p(
      "Then there’s everyday friction. One app for the cameras, another for the lock, a third for the speakers. Each has its own login, its own updates and its own way of doing things. Family members give up and go back to keys and switches. That’s when people decide smart homes are more trouble than they’re worth, when the real problem is how theirs was put together.",
    ),
    image({
      src: "/blog/one-home-five-vendors-garden.png",
      width: 1000,
      height: 419,
      alt: "A garden of conifers and shrubs beside a lawn",
      stock: true,
    }),
    h2("The privacy question nobody asks"),
    p(
      "Every connected device is a door into your home’s network. When devices come from many sources and are set up in a hurry, nobody keeps track of passwords, software updates, or who still has access. A former installer, an old tenant or a forgotten app account can still be connected long after anyone remembers it.",
    ),
    p(
      "A home planned as one system can be secured as one system. One team knows exactly what’s connected, keeps it up to date, and can tell you who can see what. For a family, that clarity matters more than any single feature. A camera you can’t fully trust doesn’t make you feel safer.",
    ),
    h2("What good planning looks like"),
    p(
      "A well-planned system starts the other way round. Before anyone picks a device, someone looks at the whole home: where the cables run, how the network is laid out, which systems need to talk to each other, and who will look after it in five years. It’s the same thinking an architect brings to a building. The decisions you can’t see, made early, decide whether everything you can see works well later.",
    ),
    p(
      "Planning doesn’t mean doing everything at once. Many homeowners start with security and add more over time, and that’s sensible. The difference is that each step fits into a plan instead of sitting on its own. The wiring is ready, the network has room to grow, and the next addition joins what’s already there.",
    ),
    h2("Questions to ask before your next purchase"),
    p(
      "Before you add anything new, ask a few simple questions. Who will install it, and will they still be around in three years? Does it work with what you already have, or does it need yet another app? If it stops working, who is responsible for fixing it, and how quickly?",
    ),
  ]),
  seo: {
    title: "One home, five vendors: the piecemeal cost",
    description:
      "Why a smart home bought one device at a time ends up with five apps and nobody responsible for the whole, and what planning it as one system changes.",
    index: true,
  },
};

const INSTALLATION_DAY: Post = {
  title: "What Actually Happens on Installation Day",
  slug: "installation-day",
  author: AUTHOR,
  date: "2026-11-12",
  tags: ["Installation", "Planning"],
  excerpt:
    "Most of the hard decisions are made weeks before anyone arrives. The day itself should be quieter than you expect.",
  image: {
    src: "/blog/installation-day.png",
    width: 384,
    height: 216,
    alt: "A control cabinet with blue terminal blocks and a server module wired in",
    stock: true,
  },
  body: body([
    p(
      "Most people picture installation day as noise, dust and strangers in the house. In a home that has been planned properly, most of the hard decisions were made weeks earlier, and the day itself is quieter than expected.",
    ),
    h2("Before anyone arrives"),
    p(
      "The work starts with a visit. A technician and a technical lead spend about 90 minutes in the home, looking at the cabling, the network and whatever is already installed. The price that follows is fixed and itemised, so by installation day you already know what is going in, where it goes and what it costs.",
    ),
    p(
      "That visit is also where the awkward questions get answered. Which walls can be opened and which cannot. Where the equipment will live. What stays and what is replaced. None of that should be decided with a drill in someone’s hand.",
    ),
    h2("The first hours: cables and the cabinet"),
    p(
      "The least visible work comes first. Cables are run or checked, and the equipment that runs the home is fitted in one place, usually a cabinet or a cupboard close to the network. This is the part nobody photographs, and it decides how reliable everything else will be.",
    ),
    p(
      "Most of our jobs are in homes people are already living in, so the work is planned around the household. Anything sound that is already in place is kept, and anything that needs replacing is explained before it is touched.",
    ),
    h2("Devices second, the system third"),
    p(
      "Only then do the visible parts go on the wall: cameras, locks, keypads, speakers and panels. Fitting a device takes minutes. Making it part of one system takes longer. Each one is added to the network, named for the room it is in, and tested from the app and from the wall.",
    ),
    quote("Fitting a device takes minutes. Making it part of one system takes longer."),
    h2("Handover"),
    p(
      "The last step is the easiest one to rush. Everyone who will use the system is shown how, including the people who did not ask for it. You are left with a record of what was installed, where it sits and how it is configured. That record is yours.",
    ),
    h2("What to ask your installer"),
    li("Who will be in my home, and who is in charge on the day?"),
    li("What will be working by the evening, and what will not?"),
    li("Where will the equipment live, and can I see it?"),
    li("What record do I get at the end, and who owns it?"),
    box("A good installation day is uneventful. If it feels dramatic, the planning was missing."),
  ]),
  seo: {
    title: "What happens on installation day",
    description:
      "What a planned smart home installation looks like from the first visit to handover: the order of the work, who is in your home and what you are left with.",
    index: true,
  },
};

const ON_THE_WALL: Post = {
  title: "Why the Best Smart Homes Still Have Something on the Wall",
  slug: "something-on-the-wall",
  author: AUTHOR,
  date: "2026-10-29",
  tags: ["Design", "Everyday use"],
  excerpt:
    "A phone is a poor light switch. The homes that are easy to live in keep a few plain controls where your hand already goes.",
  image: {
    src: "/blog/something-on-the-wall.png",
    width: 384,
    height: 216,
    alt: "A hand reaching for a wall touch panel above a kitchen counter",
    stock: true,
  },
  body: body([
    p(
      "It is tempting to think a smart home lives in an app. The app matters, but it is the wrong first control for almost everything you do in a house. Nobody wants to unlock a phone to turn on a light.",
    ),
    h2("The phone is the wrong first control"),
    p(
      "A phone belongs to one person. A home is used by a family, by guests, by staff and by children, and half of them will never install the app. The phone is also somewhere else at the moment you need it: charging upstairs, in a bag, in the other hand.",
    ),
    p(
      "A control on the wall has none of those problems. It is where your hand already goes when you walk into a room, it works for whoever is standing there, and it needs no login.",
    ),
    h2("What belongs on the wall"),
    li("A keypad by the door of each main room, with a few buttons that say what they do."),
    li("One larger panel where the household gathers, for the things that need a screen."),
    li("A thermostat you can read from across the room."),
    li("The entry panel by the front door, for whoever is at the gate."),
    p(
      "The buttons should name what happens in the room, not the device behind it. “Evening” is a better label than “Dimmer 2”. One press sets the lights, the curtains and the temperature together, and the same press works every day.",
    ),
    h2("Fewer buttons, better labels"),
    p(
      "The usual mistake is to give every function its own button. A wall of twelve unlabelled switches is harder to use than the four it replaced. A good keypad has a handful of choices, in words, and an obvious way to turn everything off.",
    ),
    quote(
      "A system that needs an expert to operate has failed. Everyone in the house should be able to use it without being taught twice.",
    ),
    h2("The test: a guest on their first evening"),
    p(
      "Picture someone who has never been in your home. Can they turn on the bathroom light, close the curtains in their room and set the temperature without asking? If they can, the system is well designed. If they need the app, a tutorial or you, it is not finished.",
    ),
    p(
      "The app is still worth having. It is where you check the cameras from the office, let a delivery in and change how a scene behaves. It works best as the second way to do things, never the only one.",
    ),
  ]),
  seo: {
    title: "Why smart homes still need wall controls",
    description:
      "An app is the wrong first control for a home. What belongs on the wall, how few buttons it takes and the simple test of a guest on their first evening.",
    index: true,
  },
};

const WIFI: Post = {
  title: "Wi-Fi Isn’t Enough: The Network Your Smart Home Really Runs On",
  slug: "wifi-is-not-enough",
  author: AUTHOR,
  date: "2026-10-20",
  tags: ["Networking", "Planning"],
  excerpt:
    "Every camera, lock and speaker leans on the same network. If that network is one router in a cupboard, everything else inherits its limits.",
  image: {
    src: "/blog/wifi-is-not-enough.png",
    width: 384,
    height: 216,
    alt: "A thermostat with a dial on a pale wall between two doorways",
    stock: true,
  },
  body: body([
    p(
      "When a smart home misbehaves, the device usually gets the blame. The camera freezes, the speaker drops out, the doorbell answers late. Very often the device is fine and the network under it is not.",
    ),
    h2("One router was never meant for this"),
    p(
      "The router your internet provider supplies is built to get a few phones and laptops online. A connected home asks far more of it: cameras sending video all day, panels and speakers in every room, locks and sensors that must answer at once. One box in a cupboard near the front door cannot cover a villa on its own.",
    ),
    p(
      "Villa walls are usually concrete or block, and Wi-Fi does not pass through them well. The signal that is strong in the hall can be unusable two rooms away, and outdoors by the gate, where the camera and the intercom are, it is often weakest of all.",
    ),
    h2("What should be on a cable"),
    p(
      "The rule is simple. Anything that does not move should be wired if it can be. Cameras, the intercom, the television, wall panels and the equipment in the cabinet all work better on a cable, and many can take their power over the same one.",
    ),
    p(
      "Wi-Fi is then left for what really is wireless: phones, tablets and the few devices that cannot be reached by a cable. With less to carry, it does that job far better.",
    ),
    h2("Coverage is designed, not boosted"),
    p(
      "Plug-in boosters are the usual fix, and they mostly move the problem. Proper coverage comes from access points placed for the building, each wired back to the same network, so a phone moves between them without dropping.",
    ),
    box(
      "If your installer has not asked where your router is and how the house is cabled, they have not planned the network.",
    ),
    h2("Keeping devices apart"),
    p(
      "A well-set-up network also keeps things separate. Guests get internet access without seeing your cameras. The devices that run the house sit on their own part of the network, away from laptops and phones. If one thing is compromised, it cannot reach everything else.",
    ),
    h2("Questions worth asking"),
    li("Which devices will be wired, and which will rely on Wi-Fi?"),
    li("Where will the access points go, and how were those places chosen?"),
    li("Are guests and household devices kept apart?"),
    li("Who looks after the network once the installation is finished?"),
  ]),
  seo: {
    title: "Wi-Fi is not enough for a smart home",
    description:
      "Why one router cannot run a connected villa: what belongs on a cable, how coverage is planned and how to keep household devices apart from guests.",
    index: true,
  },
};

/** Newest first, as the site lists them. */
export const POSTS: readonly Post[] = [INSTALLATION_DAY, FIVE_VENDORS, ON_THE_WALL, WIFI];
