import { ChevronLeftIcon, ChevronRightIcon, PlusCircledIcon } from "@radix-ui/react-icons";
import { FieldProps } from "@rjsf/utils";
import { filter, find, findIndex, get } from "lodash-es";
import { useEffect } from "react";
import { useBlocksStore } from "~/hooks/history/use-blocks-store-undoable-actions";
import { useAddBlock } from "~/hooks/use-add-block";
import { useSelectedBlock, useSelectedBlockIds } from "~/hooks/use-selected-blockIds";
import { useWrapperBlock } from "~/hooks/use-wrapper-block";

const SliderField = ({ formData, onChange }: FieldProps) => {
  const [allBlocks] = useBlocksStore();
  const selectedBlock = useSelectedBlock();
  const wrapperBlock = useWrapperBlock();
  const { addCoreBlock } = useAddBlock();
  const [, setBlockIds] = useSelectedBlockIds();

  const sliderBlock = selectedBlock?._type === "Slider" ? selectedBlock : wrapperBlock;
  const slidesBlock = find(allBlocks, { _parent: sliderBlock?._id, _type: "Slides" });
  const allSlideBlocks = filter(allBlocks, { _parent: slidesBlock?._id, _type: "Slide" });
  const currentSlide = formData?.currentSlide || get(allSlideBlocks, "0._id");

  useEffect(() => {
    if (selectedBlock?._type === "Slide" && formData?.currentSlide !== selectedBlock?._id) {
      onChange({ ...formData, currentSlide: selectedBlock?._id });
    }
  }, [selectedBlock]);

  useEffect(() => {
    if (allSlideBlocks?.length && !find(allSlideBlocks, { _id: formData?.currentSlide })) {
      onChange({ ...formData, currentSlide: get(allSlideBlocks, "0._id") });
    }
  }, [formData, allSlideBlocks]);

  if (!selectedBlock && !wrapperBlock) return null;
  if (!slidesBlock) return null;

  const handleNext = () => {
    const currentIndex = findIndex(allSlideBlocks, { _id: currentSlide });
    if (currentIndex > -1) {
      const nextIndex = (currentIndex + 1) % allSlideBlocks.length;
      const nextSlideId = get(allSlideBlocks, [nextIndex, "_id"]);
      if (!nextSlideId) return;
      onChange({ ...formData, currentSlide: nextSlideId });
      setBlockIds([nextSlideId]);
    }
  };

  const handlePrevious = () => {
    const currentIndex = findIndex(allSlideBlocks, { _id: currentSlide });
    if (currentIndex > -1) {
      const previousIndex = (currentIndex - 1 + allSlideBlocks.length) % allSlideBlocks.length;
      const previousSlideId = get(allSlideBlocks, [previousIndex, "_id"]);
      if (!previousSlideId) return;
      onChange({ ...formData, currentSlide: previousSlideId });
      setBlockIds([previousSlideId]);
    }
  };

  const addNextSlide = () => {
    const newSlideBlock = addCoreBlock(
      { styles: "#styles:,h-full w-full min-w-full", type: "Slide" },
      slidesBlock?._id,
    );
    const newSlideBlockId = newSlideBlock?._id;
    if (!newSlideBlockId) return;
    onChange({ ...formData, currentSlide: newSlideBlockId });
    setBlockIds([newSlideBlockId]);
  };

  return (
    <div className="space-y-1.5 px-2">
      <div className="flex items-center gap-x-2 pb-2 text-[12px]">
        <button onClick={handlePrevious} className="rounded bg-gray-200 p-1.5 hover:opacity-80">
          <ChevronLeftIcon className="h-3 w-3" />
        </button>
        <div className="whitespace-nowrap text-center text-[10px] text-slate-500">
          {currentSlide ? (
            <span className="">
              <b className="text-[12px]"> {findIndex(allSlideBlocks, { _id: currentSlide }) + 1}</b>/
              {allSlideBlocks.length}
            </span>
          ) : (
            "-"
          )}
        </div>
        <button onClick={handleNext} className="rounded bg-gray-200 p-1.5 hover:opacity-80">
          <ChevronRightIcon className="h-3 w-3" />
        </button>
        <button
          onClick={addNextSlide}
          className="flex w-full items-center justify-center gap-x-1 rounded bg-gray-200 p-1.5 text-xs font-medium leading-tight hover:opacity-80">
          <PlusCircledIcon className="h-3 w-3" />
          Add Slide
        </button>
      </div>

      <div className="flex items-center gap-x-2 leading-tight">
        <input
          type="checkbox"
          checked={Boolean(formData?.showSlideButton)}
          onChange={() => onChange({ ...formData, showSlideButton: !Boolean(formData?.showSlideButton) })}
          className="cursor-pointer"
        />
        <label htmlFor="autoplay" className="mt-0.5 text-[12px]">
          Show Slide Buttons
        </label>
      </div>

      <div className="flex items-center gap-x-2 leading-tight">
        <input
          type="checkbox"
          checked={Boolean(formData?.showSlideNavbar)}
          onChange={() => onChange({ ...formData, showSlideNavbar: !Boolean(formData?.showSlideNavbar) })}
          className="cursor-pointer"
        />
        <label htmlFor="autoplay" className="mt-0.5 text-[12px]">
          Show Slide Navbar
        </label>
      </div>

      <div>
        <div className="flex flex-col">
          <div className="flex items-center gap-x-2 leading-tight">
            <input
              type="checkbox"
              checked={Boolean(formData?.autoplay)}
              onChange={() => onChange({ ...formData, autoplay: !Boolean(formData?.autoplay) })}
              className="cursor-pointer"
            />
            <label htmlFor="autoplay" className="mt-0.5 text-[12px]">
              Autoplay slides
            </label>
          </div>
          {formData?.autoplay && (
            <div className="pt-0.5 leading-tight">
              <label htmlFor="interval" className="whitespace-nowrap text-[9px]">
                Autoplay Interval <span className="font-light opacity-80">(in seconds)</span>
              </label>
              <input
                type="number"
                id="interval"
                name="interval"
                placeholder="0"
                value={formData?.autoplayInterval}
                className="text-xs"
                pattern="[0-9]*"
                onChange={(e) => {
                  let value = e.target.value;
                  if (value.length) value = value.replace("-", "");
                  onChange({ ...formData, autoplayInterval: value });
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { SliderField };
