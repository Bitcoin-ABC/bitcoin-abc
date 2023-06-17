// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
import Image from 'next/image';
import check from '/public/images/circle-check.svg';
import fork from '/public/images/code-branch.svg';
import brain from '/public/images/brain.svg';
import GlitchText from '/components/glitch-text';
import { roadmap, getRoadmapStatuses } from '/data/roadmap';
import {
    Legend,
    WhiteIcon,
    PinkIcon,
    BlueIcon,
    RoadmapCtn,
    RoadmapBlock,
    TitleCtn,
    Dot,
    Title,
    ItemsCtn,
    ItemOuter,
    ItemInner,
    TaglineCtn,
} from './styles';
import { getStatusValues } from './status.js';

export default function Roadmap() {
    const allStatuses = getRoadmapStatuses();
    return (
        <>
            <Legend>
                <div>
                    <WhiteIcon
                        src={check}
                        alt="eCash Roadmap"
                        width={20}
                        height={20}
                    />
                    = Complete<span>|</span>
                </div>
                <div>
                    <PinkIcon
                        src={fork}
                        alt="eCash Roadmap"
                        width={20}
                        height={20}
                    />
                    = Underway<span>|</span>
                </div>
                <div>
                    <BlueIcon
                        src={brain}
                        alt="eCash Roadmap"
                        width={20}
                        height={20}
                    />
                    = Planning
                </div>
            </Legend>

            <RoadmapCtn>
                {roadmap.map(roadmap => (
                    <RoadmapBlock key={roadmap.title}>
                        <TitleCtn>
                            <Title>
                                <h3>{roadmap.title}</h3>
                                <p>{roadmap.description}</p>
                                <Dot />
                            </Title>
                        </TitleCtn>

                        <ItemsCtn>
                            {roadmap.items.map(roadmapitem => {
                                return (
                                    <ItemOuter
                                        status={roadmapitem.status}
                                        key={roadmapitem.title}
                                        allStatuses={allStatuses}
                                    >
                                        <ItemInner
                                            status={roadmapitem.status}
                                            allStatuses={allStatuses}
                                        >
                                            <div>
                                                <Image
                                                    src={getStatusValues({
                                                        status: roadmapitem.status,
                                                        values: {
                                                            planning: brain,
                                                            underway: fork,
                                                            complete: check,
                                                        },
                                                        allStatuses:
                                                            allStatuses,
                                                    })}
                                                    alt="eCash Roadmap"
                                                    width={30}
                                                    height={30}
                                                />
                                            </div>
                                            <div>
                                                <h4>{roadmapitem.title}</h4>
                                                <p>{roadmapitem.description}</p>
                                            </div>
                                        </ItemInner>
                                    </ItemOuter>
                                );
                            })}
                            <TaglineCtn>
                                <div>
                                    <WhiteIcon
                                        src={roadmap.tagline_icon}
                                        alt="eCash Roadmap"
                                        width={30}
                                        height={30}
                                    />
                                </div>
                                <div>
                                    <h4>
                                        <GlitchText text={roadmap.tagline} />
                                    </h4>
                                    <p>{roadmap.tagline_description}</p>
                                </div>
                            </TaglineCtn>
                        </ItemsCtn>
                    </RoadmapBlock>
                ))}
            </RoadmapCtn>
        </>
    );
}
