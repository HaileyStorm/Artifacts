**Last Time:**

Welcome back, everyone! Last time, I gave a basic overview of how to create an algorithm to reproduce an image using just a single thread wrapped around nails. It involved a lot of modeling, a little bit of math, and a sneak peek at the machine used to create the final product.

**New Method:**

In this video, I'll be taking some inspiration from CT scanners to improve the algorithm. It turns out that CT scanners make use of something called the Radon Transform, which we can repurpose for string art.

Now, what inspired me to use the Radon Transform? Well, you did! Many of you suggested it, so thank you. This video wouldn’t be possible without such a helpful community supporting me.

But what is the Radon Transform, and how can we use it to convert an input image into string art? Let’s find out.

**Intro [Music]**

**Rules:**

Here’s the aim of the game: we have a circular white canvas with radius \(R\), and \(N\) nails equally spaced around the edge. We can parameterize any line of string with a starting nail angle, which I’ll call \(S_1\), and an ending nail angle, \(S_2\). Our job is to recreate an image as best we can by drawing straight black lines between these nails.

**Radon Transform:**

So, what is the Radon Transform, then? Well, for the purposes of this video, let’s simplify. Imagine we have an image like this. Now, imagine shining a ray of light through the image.

This line of light can be fully described by two parameters: an angle from the horizontal, which I’ll call \(\alpha\), and a perpendicular distance to the line, which I’ll call \(s\).

What does this line of light do? Well, let’s put a detector on the other side. The detector measures only one thing: it measures all the combined stuff the light ray bumped into along the way. In this context, it measures what's called a line integral, which is essentially the area under the curve along this path. We call this detector value \(\rho\), and it’s a function of both \(\alpha\) and \(s\).

As you can imagine, if we change the values of \(\alpha\) and \(s\) such that the light ray passes through darker parts of the image, the area under the curve would be larger, resulting in a larger \(\rho\) value. This is important, and we’ll exploit this feature in our algorithm later.

Now, imagine shining lots of light beams—so many, in fact, that the entire image is scanned with every possible combination of \(\alpha\) and \(s\). If you collect all this data and plot \(\rho\) versus \(\alpha\) and \(s\), you’ll get something that looks like this. This is called a sinogram.

So, what is the Radon Transform? It's just a way to convert, or transform, an image into this \(\rho\) of \(\alpha\) and \(s\). It turns out that programming languages like MATLAB and Python can perform this transformation lightning fast.

**First Attempt:**

But what’s the advantage of doing this transformation in the first place? How does this help us with string art? Well, the largest value of \(\rho\)—this point right here—corresponds to the line that passes through the most dark pixels in the image, suggesting that we should draw this line.

This motivates the idea of fitting, just like before, but this time in the Radon domain. In other words, can we represent \(\rho(\alpha, s)\) as a weighted sum of possible lines? Here, \(\rho_1\) is the Radon Transform of the first line, \(\rho_2\) is the Radon Transform of the second line, and so on. The binary weights, \(x_1, x_2, \dots\), are what we need to find—either 1 (draw the line) or 0 (don’t draw it).

We spent a lot of time discussing how to solve this type of equation last time, but to do it this time, we’ll need an analytical equation for the Radon Transform of each line.

**Radon Transform of a Line:**

Finding the Radon Transform of a thin line of thread is generally difficult because it involves calculating the line integral by hand. I won’t bore you with the mathematics, but after using a lot of tricks and a few assumptions, you can simplify \(\rho_{\text{line}}(\alpha, s)\) into a very manageable function. This is something a computer can calculate really quickly.

At the end of the day, we have a formula for rapidly calculating the Radon Transform of any individual line. Here’s what it looks like for this line, and for this line, and for this line, for example.

**The Plan:**

So, here’s the game plan. We’ll start with the Radon Transform of the image. Then, we’ll identify the \(\alpha\) and \(s\) values of the brightest point—that will be the first line we draw. Next, we’ll create the Radon Transform of the line corresponding to those \(\alpha\) and \(s\) values and subtract that from the original Radon Transform of the image.

That’s just one iteration. We’ll repeat this process: identify the maximum point in the new sinogram, draw the corresponding line, create the corresponding Radon Transform, and subtract again. We’ll keep doing this until we reach some desired threshold or a predefined number of maximum lines to draw. Then, we sit back and relax.

**Uh-oh! Failure:**

Oh, wait—something’s wrong. The edges aren’t being drawn properly. What’s going on?

Well, after some investigation, I figured out the problem. We don’t actually care about the maximum value of \(\rho\) at each iteration, which measures the line with the most total darkness. What we really care about is the maximum value of \(\rho\) per unit length. This way, we select the line with the largest *average* darkness, not total darkness. We don’t want to penalize short lines or reward long ones disproportionately.

**Improvement 1:**

To account for this, let’s consider a line of length \(L\) on our circular canvas. We can express it in terms of \(\alpha\) and \(s\). Since this is a right-angle triangle with radius \(R\), we can use Pythagoras’ theorem to calculate \(L\), which is just:

\[
L = 2\sqrt{R^2 - s^2}
\]

Finally, we can divide \(\rho\) by \(L\) to get \(\rho/L\), the average darkness per unit length. With this adjustment, the edges now get drawn beautifully.

**Final Product [Montage Music]:**

Here’s the final product after running the algorithm on this image, and here’s another image, and another.

Finally, we can do something fun with color! By slightly adjusting the darkness of the threads, we can reproduce an image using cyan, magenta, and yellow string (CMYK color). Here's what that looks like.

**Conclusion:**

So, there you have it—a simple improvement that radically changes the quality of the final string art. If you have any questions or suggestions, feel free to leave them in the comments. Thanks again for all your support, and see you next time!