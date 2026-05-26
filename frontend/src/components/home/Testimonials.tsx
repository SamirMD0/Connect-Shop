import Image from 'next/image';

const testimonials = [
  {
    review: 'Lorem ipsum dolor sit amet, adipiscing elit. Donec malesuada justo vitae augue suscipit beautiful vehicula.',
    authorName: 'Davis Dorwart',
    authorImg: '/nextmerce/users/user-01.jpg',
    authorRole: 'Serial Entrepreneur',
  },
  {
    review: 'Lorem ipsum dolor sit amet, adipiscing elit. Donec malesuada justo vitae augue suscipit beautiful vehicula.',
    authorName: 'Wilson Dias',
    authorImg: '/nextmerce/users/user-02.jpg',
    authorRole: 'Backend Developer',
  },
  {
    review: 'Lorem ipsum dolor sit amet, adipiscing elit. Donec malesuada justo vitae augue suscipit beautiful vehicula.',
    authorName: 'Miracle Exterm',
    authorImg: '/nextmerce/users/user-03.jpg',
    authorRole: 'Serial Entrepreneur',
  },
];

function Stars() {
  return (
    <div className="mb-5 flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <Image
          key={index}
          src="/nextmerce/icons/icon-star.svg"
          alt=""
          width={15}
          height={15}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="overflow-hidden bg-white pb-14 sm:pb-16">
      <div className="mx-auto w-full max-w-[1170px] px-4 sm:px-8 xl:px-0">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <span className="mb-1.5 flex items-center gap-2.5 font-medium text-[#0B1B48]">
              <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#3C50E0]/10">
                <span className="h-2 w-2 rounded-full bg-[#3C50E0]" />
              </span>
              Testimonials
            </span>
            <h2 className="text-2xl font-semibold text-[#0B1B48] sm:text-[28px]">
              User Feedbacks
            </h2>
          </div>

          <div className="hidden items-center gap-3 sm:flex" aria-hidden="true">
            <button className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-[#0B1B48] transition-colors hover:border-[#3C50E0] hover:text-[#3C50E0]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 5L8 12L15 19"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-[#0B1B48] transition-colors hover:border-[#3C50E0] hover:text-[#3C50E0]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 5L16 12L9 19"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {testimonials.map((testimonial) => (
            <article
              key={`${testimonial.authorName}-${testimonial.authorRole}`}
              className="rounded-[10px] bg-white px-5 py-8 shadow-xl shadow-slate-200/80 ring-1 ring-slate-100 sm:px-8"
            >
              <Stars />

              <p className="mb-6 leading-7 text-[#0B1B48]">{testimonial.review}</p>

              <div className="flex items-center gap-4">
                <div className="relative h-[50px] w-[50px] overflow-hidden rounded-full">
                  <Image
                    src={testimonial.authorImg}
                    alt={testimonial.authorName}
                    fill
                    sizes="50px"
                    className="object-cover"
                  />
                </div>

                <div>
                  <h3 className="font-medium text-[#0B1B48]">{testimonial.authorName}</h3>
                  <p className="text-sm text-slate-500">{testimonial.authorRole}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
