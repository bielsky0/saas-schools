import { Cross1Icon, PlusIcon } from "@radix-ui/react-icons";
import { FieldProps } from "@rjsf/utils";
import { get, map, reject } from "lodash-es";

const SourcesField = ({ formData, onChange }: FieldProps) => {
  const srcsets = get(formData, "srcsets", []) || [];

  const onChangeSources = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const key = e.target.name;
    const value = e.target.value;
    onChange({
      srcsets: map(srcsets, (source, i) => {
        if (i === index) {
          return { ...source, [key]: value };
        } else {
          return source;
        }
      }),
    });
  };

  const addNewSource = () => {
    onChange({ srcsets: [...srcsets, {}] });
  };

  const removeSource = (index: number) => {
    onChange({ srcsets: reject(srcsets, (_, i) => parseInt(i) === index) });
  };

  return (
    <div>
      <div className="flex items-center justify-between pb-2">
        <label>Responsive Video (optional)</label>
        <button
          type="button"
          onClick={addNewSource}
          className="flex items-center gap-x-1 rounded-md border border-blue-500 bg-blue-100 px-2 py-px text-xs text-blue-600 hover:opacity-80">
          <PlusIcon className="h-3 w-3" />
        </button>
      </div>
      <div className="space-y-2">
        {srcsets.length === 0 ? (
          <div className="rounded border border-dashed border-gray-200 p-2 text-xs italic text-gray-500">
            Add additional sources to create responsive videos
          </div>
        ) : (
          map(srcsets, (source, index) => {
            return (
              <div key={index} className="group relative space-y-1.5 rounded border border-gray-200 px-2 pb-1.5">
                <button
                  type="button"
                  onClick={() => removeSource(index)}
                  className="absolute -right-px -top-0 -translate-y-1/2 rounded-full bg-red-100 p-1 opacity-0 hover:bg-red-200 group-hover:opacity-100">
                  <Cross1Icon className="h-2.5 w-2.5 text-red-500" />
                </button>
                <div className="flex items-center gap-x-2 rounded border">
                  <label className="flex !h-6 h-full w-1/4 items-center justify-center bg-gray-200 px-2 !text-[10px] !font-medium">
                    Width
                  </label>
                  <input
                    name="width"
                    placeholder="Enter width (in px)"
                    type="number"
                    value={get(source, "width")}
                    onChange={(e) => onChangeSources(e, index)}
                    className="!placeholder:text-gray-100 !mt-0 !rounded-none !border-0 !p-0 !text-xs"
                  />
                </div>
                <div className="flex items-center gap-x-2 rounded border">
                  <label className="flex !h-6 h-full w-1/4 items-center justify-center bg-gray-200 px-2 !text-[10px] !font-medium">
                    URL
                  </label>
                  <input
                    name="url"
                    placeholder="Enter url"
                    className="!mt-0 !rounded-none !border-0 !p-0 !text-xs !shadow-none"
                    value={get(source, "url", "")}
                    onChange={(e) => onChangeSources(e, index)}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export { SourcesField };
