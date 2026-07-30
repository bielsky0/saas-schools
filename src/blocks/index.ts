import { registerChaiBlock } from "@chaibuilder/sdk/runtime";

import { Component as GroupTypeCard, Config as GroupTypeCardConfig } from "./GroupTypeCard/config";
import { Component as UpcomingEvents, Config as UpcomingEventsConfig } from "./UpcomingEvents/config";
import { Component as BookingButton, Config as BookingButtonConfig } from "./BookingButton/config";
import { Component as InstructorCard, Config as InstructorCardConfig } from "./InstructorCard/config";

registerChaiBlock(GroupTypeCard, GroupTypeCardConfig);
registerChaiBlock(UpcomingEvents, UpcomingEventsConfig);
registerChaiBlock(BookingButton, BookingButtonConfig);
registerChaiBlock(InstructorCard, InstructorCardConfig);
