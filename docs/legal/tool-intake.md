# New-tool intake: Google Analytics 4 and Microsoft Clarity

The new-tool intake gate (Legal System §16), run on 2026-11-21 for the two tools the consent deck's open items name (`src/content/legal/consent-content-deck.md` §13, item 8). Every answer comes from a vendor page opened that day, cited below. What a vendor does not publish is marked as such, not filled in.

**What it found.** Google Analytics 4 can be run as a processor, once two settings are confirmed. Microsoft Clarity cannot: its terms make Microsoft an independent controller, free to use the data for its own purposes, advertising profiles included. The published privacy policy misstates both, and lacks a disclosure each vendor's terms require. Neither tool is live (both ids only take effect on the merge to `main`), so the fixes land before either runs.

## Google Analytics 4

| Gate question                  | Answer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Personal or confidential data? | Yes, after an accept only: pages viewed, device, referrer, approximate location from the IP address, and a cookie id. Named in the privacy policy's §4.1                                                                                                                                                                                                                                                                                                                                   |
| Where does it go?              | Anywhere Google or its subprocessors have facilities [1]. No region choice for a property outside the EU. Where a UAE visitor's IP is looked up is not published                                                                                                                                                                                                                                                                                                                           |
| Do the terms permit this use?  | Yes: a business tool for the owner's own trade [2]. The terms require the site to disclose its use of Google Analytics and how it collects and processes data, for example with a prominent link to Google's page "How Google uses information from sites or apps that use our services" [2]. The policy names the tool but has no such link. Which national version of the terms binds a UAE account is not published                                                                     |
| Data use and retention         | Google is a processor under the Google Ads Data Processing Terms, which new accounts accept automatically and others accept in Admin, Account details [1][3]. With "Google products & services" sharing on, Google is an independent controller of what is shared; with all four sharing settings off, the data is used only to run the service [4]. Retention is 2 or 14 months, and it governs explorations and funnel reports only: standard aggregated reports are kept regardless [5] |
| Where does liability land?     | Indirect damages excluded, Google's total liability capped at USD 500, and the site owner indemnifies and defends Google. California law [2]                                                                                                                                                                                                                                                                                                                                               |
| Register and offboarding       | The property is `G-77Q4D69EZE`. Offboarding: remove each person's access in Admin; delete the property if the tool is dropped                                                                                                                                                                                                                                                                                                                                                              |

**To do before it runs**

- [ ] Admin, Account details: confirm the Data Processing Terms are accepted (Shivanshu)
- [ ] Admin, Account settings: turn all four data-sharing settings off, so Google stays a processor (Shivanshu)
- [ ] Data retention to 14 months (already on the launch list)
- [ ] Privacy policy: add the link to Google's page, and correct §6's "Analytics data: up to 14 months, then deletion", since aggregated reports outlive it

## Microsoft Clarity

| Gate question                  | Answer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Personal or confidential data? | Yes: clicks, scrolling, pointer movement and the pages viewed, with a page-view id before a choice and cookies after an accept. Form input is masked twice: the project is set to Strict (2026-11-21) and every field carries `data-clarity-mask`. Named in the privacy policy's §4.1                                                                                                                                                                                                                                                                                                    |
| Where does it go?              | Microsoft's Azure cloud [6]; Microsoft's Privacy Statement allows the visitor's region, the United States, or anywhere Microsoft operates [7]. No region choice                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Do the terms permit this use?  | For internal business purposes and analytics, on a site that is not aimed at under-18s and carries no health, financial or government content [8][6]. The terms require the privacy notice to say that Microsoft collects personal data to provide Microsoft Advertising, and to link to the Microsoft Privacy Statement [8, §4.4b]. The policy does neither                                                                                                                                                                                                                             |
| Data use and retention         | Smarthaus and Microsoft are independent controllers, and neither is a processor [8, §4.4c.i]. Microsoft may use the data for the purposes in its Privacy Statement, including improving its products and creating user profiles for purposes that include advertising [8, §4.4c.iii]. No setting limits that. The policy lists Clarity among providers that process information "on our instructions", which is wrong. Recordings are kept 30 days, favourites and a random sample up to 9 months, and heatmaps up to 9 months; the only way to delete data is to delete the project [6] |
| Cookies                        | With the project's Cookies setting off (2026-11-21), Clarity sets none until a consent signal [9]. Once `analytics_Storage` is granted it sets first-party cookies (`_clck`, `_clsk`) and third-party ones (`CLID`, `MUID`, `ANONCHK`, `MR`, `SM`), `MUID` among them described as advertising [10][11]. The site always sends `ad_Storage: "denied"` (`src/lib/clarity.ts`); Microsoft does not say which cookies that withholds                                                                                                                                                        |
| Where does liability land?     | Direct damages only, up to USD 5; the site owner indemnifies Microsoft for anything relating to its websites or its use of Clarity; binding arbitration under Washington law [8, §11, §17]                                                                                                                                                                                                                                                                                                                                                                                               |
| Register and offboarding       | One project. Offboarding: remove each member; delete the project to delete its data                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

**To do before it runs**

- [ ] Privacy policy §4: move Clarity out of the providers acting on our instructions, and say that Microsoft is an independent controller that may use the data for its own purposes, advertising included, with the link to the Microsoft Privacy Statement
- [ ] Consent wording: "Neither tool is used to advertise to you" is true of our use, not of Microsoft's; reword with counsel
- [ ] Privacy policy §6: session recordings 30 days, a sample and favourites up to 9 months
- [ ] On the replay check (launch list), list the cookies an accept sets, to learn whether `ad_Storage: "denied"` withholds `MUID`
- [ ] Counsel: questions 23 to 25 in the legal review pack (Clarity's controller status and advertising use, Google's disclosure, both liability caps)

## Not published by the vendors

- Which national version of the Google Analytics terms binds a UAE account (the UAE path does not exist; the US version was read)
- Where Google stores Analytics data, and where it looks up a UAE visitor's IP address
- Google's default for the four data-sharing settings
- Clarity's data region beyond Azure, its subprocessors, any setting that limits Microsoft's own use, and the retention of its dashboards
- Which Clarity cookies follow `ad_Storage` rather than `analytics_Storage`

Google Workspace, Vercel, Resend and Sanity were adopted before the gate was run on this project, and have no entry here yet.

## Sources

Opened on 2026-11-21.

1. Google Ads Data Processing Terms, v8.0, §10.1 and §11.2: https://business.safety.google/adsprocessorterms/ (subprocessors: https://business.safety.google/adssubprocessors/)
2. Google Analytics Terms of Service, §7, §8, §11: https://marketingplatform.google.com/about/analytics/terms/us/
3. Data processing terms in Analytics: https://support.google.com/analytics/answer/3379636
4. Data sharing settings: https://support.google.com/analytics/answer/1011397
5. Data retention: https://support.google.com/analytics/answer/7667196
6. Clarity FAQ: https://learn.microsoft.com/en-us/clarity/faq
7. Microsoft Privacy Statement: https://www.microsoft.com/en-us/privacy/privacystatement
8. Microsoft Clarity Terms of Use: https://clarity.microsoft.com/terms
9. Clarity consent mode: https://learn.microsoft.com/en-us/clarity/setup-and-installation/consent-mode
10. Clarity consent API v2: https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2
11. Clarity cookies: https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-cookies
