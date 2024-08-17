// // Tests for mmap-io (duh!)
// // Some lines snatched from Ben Noordhuis test-script of "node-mmap"
//
// import fs from 'fs';
// import os from 'os';
// import mmap from '../';
// import assert from 'assert';
// import constants from 'constants';
//
// const say = (...args: any[]) => console.log(...args);
//
// say("mmap in test is", mmap);
//
// const { PAGESIZE, PROT_READ, PROT_WRITE, MAP_SHARED } = mmap;
//
// try {
//     say("mmap.PAGESIZE = ", mmap.PAGESIZE, "tries to overwrite it with 47");
//     mmap.PAGESIZE = 47;
//     say("now mmap.PAGESIZE should be the same:", mmap.PAGESIZE, "silently kept");
// } catch (e) {
//     say("Caught trying to modify the mmap-object. Does this ever happen?", e);
// }
//
// // open self (this script)
// const fd = fs.openSync(process.argv[1], 'r');
// const size = fs.fstatSync(fd).size;
// say("file size", size);
//
// // full 6-arg call
// let buffer = mmap.map(size, PROT_READ, MAP_SHARED, fd, 0, mmap.MADV_SEQUENTIAL);
// say("buflen 1 = ", buffer.length);
// assert.equal(buffer.length, size);
//
// say("Give advise with 2 args");
// mmap.advise(buffer, mmap.MADV_NORMAL);
//
// say("Give advise with 4 args");
// mmap.advise(buffer, 0, mmap.PAGESIZE, mmap.MADV_NORMAL);
//
// // Read the data..
// // *todo* this isn't really helpful as a test..
// say("\n\nBuffer contents, read byte for byte backwards and see that nothing explodes:\n");
// try {
//     let out = "";
//     for (let ix = size - 1; ix >= 0; ix--) {
//         out += String.fromCharCode(buffer[ix]);
//     }
//
//     // not implemented on Win32
//     const incore_stats = mmap.incore(buffer);
//     assert.equal(incore_stats[0], 0);
//     assert.equal(incore_stats[1], 2);
//
// } catch (e) {
//     if (e.message != 'mincore() not implemented') {
//         assert(false, "Shit happened while reading from buffer");
//     }
// }
//
// try {
//     say("read out of bounds test");
//     assert.equal(typeof buffer[size + 47], "undefined");
//
// } catch (e) {
//     say("deliberate out of bounds, caught exception - does this thing happen?", e.code, 'err-obj = ', e);
// }
//
// // Ok, I won't write a segfault catcher cause that would be evil, so this will simply be uncatchable.. /ORC
// // try {
// //     say("Try to write to read buffer");
// //     buffer[0] = 47;
// // } catch (e) {
// //     say("caught deliberate segmentation fault", e.code, 'err-obj = ', e);
// // }
//
// // 5-arg call
// buffer = mmap.map(size, PROT_READ, MAP_SHARED, fd, 0);
// say("buflen test 5-arg map call = ", buffer.length);
// assert.equal(buffer.length, size);
//
// // 4-arg call
// buffer = mmap.map(size, PROT_READ, MAP_SHARED, fd);
// say("buflen test 4-arg map call = ", buffer.length);
// assert.equal(buffer.length, size);
//
// // Snatched from Ben Noordhuis test-script:
// if (os.type() !== 'Windows_NT') {
//     // XXX: this will always fail on Windows, as it requires that offset be a
//     // multiple of the dwAllocationGranularity, which is NOT the same as the
//     // pagesize.  In addition, the offset+length can't exceed the file size.
//     const fd = fs.openSync(process.argv[1], 'r');
//     const buffer = mmap.map(size, PROT_READ, MAP_SHARED, fd, PAGESIZE);
//     say("buflen test 3 = ", buffer.length);
//     assert.equal(buffer.length, size);    // ...but this is according to spec
// }
//
// // non int param should throw exception
// const fd2 = fs.openSync(process.argv[1], 'r');
// try {
//     const buffer = mmap.map("foo", PROT_READ, MAP_SHARED, fd2, 0);
// } catch (e) {
//     say(`Pass faulty arg - caught deliberate exception: ${e.message}`);
//     // assert.equal(e.code, constants.EINVAL);
// }
//
// // zero size should throw exception
// const fd3 = fs.openSync(process.argv[1], 'r');
// try {
//     const buffer = mmap.map(0, PROT_READ, MAP_SHARED, fd3, 0);
// } catch (e) {
//     say(`Pass zero size - caught deliberate exception: ${e.message}`);
//     // assert.equal(e.code, constants.EINVAL);
// }
//
// // non-page size offset should throw exception
// const WRONG_PAGE_SIZE = PAGESIZE - 1;
// const fd4 = fs.openSync(process.argv[1], 'r');
// try {
//     const buffer = mmap.map(size, PROT_READ, MAP_SHARED, fd4, WRONG_PAGE_SIZE);
// } catch (e) {
//     say(`Pass wrong page-size as offset - caught deliberate exception: ${e.message}`);
//     // assert.equal(e.code, constants.EINVAL);
// }
//
// // faulty param to advise should throw exception
// const fd5 = fs.openSync(process.argv[1], 'r');
// try {
//     const buffer = mmap.map(size, PROT_READ, MAP_SHARED, fd5);
//     mmap.advise(buffer, "fuck off");
// } catch (e) {
//     say(`Pass faulty arg to advise() - caught deliberate exception: ${e.message}`);
//     // assert.equal(e.code, constants.EINVAL);
// }
//
// // Write tests
//
// say("Now for some write/read tests");
//
// try {
//     say("Creates file");
//
//     const test_file = "./tmp-mmap-file";
//     const test_size = 47474;
//
//     fs.writeFileSync(test_file, "");
//     fs.truncateSync(test_file, test_size);
//
//     say("open write buffer");
//     const fd_w = fs.openSync(test_file, 'r+');
//     say("fd-write = ", fd_w);
//     const w_buffer = mmap.map(test_size, PROT_WRITE, MAP_SHARED, fd_w);
//     fs.closeSync(fd_w);
//     mmap.advise(w_buffer, mmap.MADV_SEQUENTIAL);
//
//     say("open read buffer");
//     const fd_r = fs.openSync(test_file, 'r');
//     const r_buffer = mmap.map(test_size, PROT_READ, MAP_SHARED, fd_r);
//     fs.closeSync(fd_r);
//     mmap.advise(r_buffer, mmap.MADV_SEQUENTIAL);
//
//     say("verify write and read");
//
//     for (let i = 0; i < test_size; i++) {
//         const val = 32 + (i % 60);
//         w_buffer[i] = val;
//         assert.equal(r_buffer[i], val);
//     }
//
//     say("Write/read verification seemed to work out");
//
// } catch (e) {
//     say("Something fucked up in the write/read test::", e.message);
// }
//
// try {
//     say("sync() tests x 4");
//
//     say("1. Does explicit blocking sync to disk");
//     mmap.sync(w_buffer, 0, test_size, true, false);
//
//     say("2. Does explicit blocking sync without offset/length arguments");
//     mmap.sync(w_buffer, true, false);
//
//     say("3. Does explicit sync to disk without blocking/invalidate flags");
//     mmap.sync(w_buffer, 0, test_size);
//
//     say("4. Does explicit sync with no additional arguments");
//     mmap.sync(w_buffer);
//
// } catch (e) {
//     say("Something fucked up for syncs::", e.message);
// }
//
// try {
//     fs.unlinkSync(test_file);
// } catch (e) {
//     say("Failed to remove test-file", test_file);
// }
//
// say("\nAll done");
//
// process.exit(0);
